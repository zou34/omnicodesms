import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

import { PaymentProvider } from "@/lib/payments/PaymentProvider";
import {
  PaymentProviderError,
  type InitializePaymentParams,
  type InitializePaymentResult,
  type PaymentEventStatus,
  type WebhookVerificationResult,
} from "@/lib/payments/types";

// Documentation : https://docs.saspay.me/api-reference/introduction
const API_BASE_URL = process.env.SASPAY_API_BASE_URL || "https://api.saspay.me/api/v1";

// SasPay attend un code ISO 4217. "FCFA" n'en est pas un : c'est le nom
// courant de deux devises distinctes — XOF (UEMOA : BJ, CI, SN, ML...) et
// XAF (CEMAC : CM, GA, TD...). Nos packs sont libellés en franc CFA
// ouest-africain, donc XOF. À passer en XAF via l'env si vous encaissez un
// jour depuis la zone CEMAC.
const CURRENCY = process.env.SASPAY_CURRENCY || "XOF";

// SasPay coupe ses propres livraisons de webhook à 15 s ; on s'aligne côté
// sortant pour ne jamais laisser une route Next.js pendre indéfiniment.
const REQUEST_TIMEOUT_MS = 15_000;

// Tolérance d'horodatage imposée par la doc SasPay (section "Sécurité —
// vérifier la signature") : au-delà, un webhook légitime intercepté
// resterait rejouable indéfiniment.
const TIMESTAMP_TOLERANCE_SECONDS = 300;

// Garde-fous de la corrélation de secours (voir resolveMerchantReference).
const SESSION_PAGE_SIZE = 100;
const MAX_SESSION_PAGES = 5;

// Seuls les events de transaction entrante nous concernent. Tout le reste
// du catalogue SasPay (settlement.*, wallet_transfer.*, webhook.test,
// transaction.created) est reçu, authentifié, puis ignoré sans effet.
const EVENT_TO_STATUS: Record<string, PaymentEventStatus> = {
  "transaction.success": "SUCCESS",
  "transaction.failed": "FAILED",
  "transaction.cancelled": "FAILED",
};

const checkoutSessionSchema = z.object({
  id: z.string().min(1),
  checkout_url: z.string().min(1),
});

/**
 * Déballe l'enveloppe standard de l'API SasPay.
 *
 * Toutes les réponses ont la forme `{ success, data, code }` (voir
 * https://docs.saspay.me/api-reference/introduction#format-des-réponses) —
 * y compris celles dont les exemples de la documentation montrent un objet
 * nu, comme la création de session de checkout. On tolère les deux formes :
 * si l'enveloppe est absente, la charge utile est déjà l'objet attendu.
 */
function unwrapEnvelope(payload: unknown): unknown {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as { data: unknown }).data;
  }

  return payload;
}

const webhookEnvelopeSchema = z.object({
  event: z.string().min(1),
  data: z.object({
    id: z.string().min(1),
    amount: z.string().optional(),
    currency: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
  }),
});

const sessionListSchema = z.object({
  next: z.string().nullish(),
  results: z.array(
    z.object({
      transaction: z.string().nullish(),
      metadata: z.record(z.string(), z.unknown()).nullish(),
    })
  ),
});

/**
 * Vérifie la signature d'une livraison webhook SasPay.
 *
 * La signature couvre `{timestamp}.{corps brut}` — l'horodatage étant inclus
 * dans le calcul, un attaquant ne peut pas le rajeunir pour contourner le
 * contrôle d'âge sans invalider la signature.
 */
function isSignatureValid(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !signature || !timestamp) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - sentAt) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  // timingSafeEqual exige deux buffers de même longueur, et une comparaison
  // de longueur ne fuit rien d'exploitable (la longueur d'un SHA-256 hex est
  // publique) — contrairement à un `===` qui s'arrête au premier octet
  // différent et laisse déduire la signature attendue.
  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * `customer_name` est obligatoire à la création d'une session SasPay, mais
 * le contrat PaymentProvider ne transporte que l'email. On dérive donc un
 * nom lisible de la partie locale de l'adresse ("awa.sossou@x.com" ->
 * "Awa Sossou"). Purement cosmétique : ce nom n'apparaît que sur la page de
 * paiement hébergée, il ne sert jamais de clé de rapprochement.
 */
function deriveCustomerName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const words = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(" ") || "Client FlashCodeSMS";
}

/**
 * Intégration de la passerelle SasPay (mobile money et carte, Afrique de
 * l'Ouest et du Centre) en mode "checkout hébergé" : on crée une session de
 * paiement, on redirige le navigateur vers `checkout_url`, et SasPay nous
 * notifie du résultat par webhook signé.
 *
 * Cette classe est le seul endroit du projet qui
 * connaît la forme de l'API SasPay — app/api/payments/checkout/route.ts et
 * app/api/webhooks/payment/route.ts ne parlent qu'au contrat PaymentProvider.
 */
export class SasPayProvider extends PaymentProvider {
  readonly name = "saspay";

  private get secretKey(): string {
    const key = process.env.SASPAY_SECRET_KEY;
    if (!key) {
      throw new PaymentProviderError(
        "SASPAY_SECRET_KEY n'est pas configurée.",
        "GATEWAY_UNAVAILABLE"
      );
    }
    return key;
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    if (!params.customerEmail) {
      throw new PaymentProviderError(
        "Une adresse e-mail client est requise par SasPay pour créer une session de paiement.",
        "GATEWAY_UNAVAILABLE"
      );
    }

    // `metadata.reference` transporte NOTRE Transaction.providerRef : c'est
    // lui que verifyWebhook cherchera pour rattacher la confirmation à la
    // bonne ligne de notre grand livre.
    //
    // `cancel_url` n'a pas d'équivalent chez SasPay : la doc précise que
    // `return_url` n'est utilisée qu'en cas de succès, et qu'un paiement
    // échoué laisse le client sur la page SasPay avec un bouton "Réessayer".
    // L'abandon est donc géré par le fait que la transaction reste PENDING
    // chez nous, jamais par un retour navigateur.
    const body = {
      amount: params.amountFcfa.toFixed(2),
      currency: CURRENCY,
      description: params.description,
      customer_email: params.customerEmail,
      customer_name: deriveCustomerName(params.customerEmail),
      return_url: params.returnUrl,
      metadata: { reference: params.reference },
    };

    // Lu hors du try : une clé absente est une erreur de configuration, pas
    // une panne réseau — la confondre avec "SasPay est injoignable" enverrait
    // sur une fausse piste au moment du diagnostic.
    const secretKey = this.secretKey;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/checkout-sessions/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new PaymentProviderError(
        `SasPay est injoignable: ${error instanceof Error ? error.message : "erreur réseau"}.`,
        "GATEWAY_UNAVAILABLE"
      );
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      // L'enveloppe d'erreur SasPay prend deux formes (erreur métier avec
      // `code`, ou erreurs de validation champ par champ) — on ne cherche
      // pas à les distinguer ici, seul le log doit rester exploitable.
      console.error(
        `[SasPayProvider] création de session refusée (HTTP ${response.status})`,
        JSON.stringify(payload)
      );
      throw new PaymentProviderError(
        "SasPay a refusé la création de la session de paiement.",
        "GATEWAY_UNAVAILABLE"
      );
    }

    const parsed = checkoutSessionSchema.safeParse(unwrapEnvelope(payload));
    if (!parsed.success) {
      console.error("[SasPayProvider] réponse de création inattendue", JSON.stringify(payload));
      throw new PaymentProviderError(
        "Réponse inattendue de SasPay à la création de la session.",
        "GATEWAY_UNAVAILABLE"
      );
    }

    return { checkoutUrl: parsed.data.checkout_url };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerificationResult> {
    const signature = headers.get("x-webhook-signature");
    const timestamp = headers.get("x-webhook-timestamp");

    if (!isSignatureValid(rawBody, signature, timestamp, process.env.SASPAY_WEBHOOK_SECRET)) {
      return { valid: false, reason: "INVALID_SIGNATURE" };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { valid: false, reason: "MALFORMED_BODY" };
    }

    const parsed = webhookEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      return { valid: false, reason: "UNRECOGNIZED_PAYLOAD" };
    }

    const { event, data } = parsed.data;
    const status = EVENT_TO_STATUS[event];

    // Event authentifié mais hors périmètre (transaction.created,
    // settlement.*, wallet_transfer.*, webhook.test) : la route répond 200
    // sans rien modifier, ce qui évite une tempête de retry côté SasPay.
    if (!status) {
      return { valid: false, reason: "UNRECOGNIZED_PAYLOAD" };
    }

    // La devise doit être celle dans laquelle la session a été créée. Sans ce
    // contrôle, un montant libellé dans une devise plus faible passerait le
    // contrôle de montant de la route (qui ne compare que des nombres) et
    // créditerait le solde en FCFA pour une somme bien moindre.
    //
    // Le contrôle vit ici plutôt que dans la route : XOF est le code que NOUS
    // envoyons à SasPay, et la route reste ainsi agnostique du fournisseur —
    // elle stocke la devise sous son nom courant, "FCFA".
    if (data.currency && data.currency.toUpperCase() !== CURRENCY.toUpperCase()) {
      console.error(
        `[SasPayProvider] devise inattendue pour la transaction ${data.id} : ` +
          `${data.currency} au lieu de ${CURRENCY}`
      );
      return { valid: false, reason: "UNRECOGNIZED_PAYLOAD" };
    }

    const reference = await this.resolveMerchantReference(data);
    if (!reference) {
      console.error(
        `[SasPayProvider] impossible de rattacher la transaction SasPay ${data.id} à une référence marchand`
      );
      return { valid: false, reason: "UNRECOGNIZED_PAYLOAD" };
    }

    // `data.amount` est le montant DEMANDÉ, pas ce que le payeur a déboursé
    // (`charged`, qui inclut les frais en mode ADD_ON). C'est bien `amount`
    // qu'il faut comparer à notre Transaction.amount, qui stocke le prix du
    // pack hors frais de passerelle.
    const amountFcfa = data.amount !== undefined ? Number(data.amount) : undefined;

    return {
      valid: true,
      event: {
        reference,
        status,
        amountFcfa: Number.isFinite(amountFcfa) ? amountFcfa : undefined,
      },
    };
  }

  /**
   * Retrouve NOTRE référence à partir de l'event SasPay.
   *
   * Chemin direct : le webhook porte lui-même `data.metadata.reference`,
   * celle qu'on a posée à la création de la session. Aucun appel réseau.
   *
   * Chemin de secours : l'exemple de payload de la documentation SasPay ne
   * montre PAS `metadata` dans `data` — l'event ne transporte que l'UUID de
   * la transaction, qui n'existait pas encore quand nous avons créé la
   * session. Dans ce cas on remonte la chaîne via l'API : on liste nos
   * sessions de checkout et on cherche celle dont le champ `transaction`
   * vaut cet UUID, puis on lit sa `metadata.reference`.
   *
   * Ce second chemin est volontairement borné (5 pages de 100 sessions, les
   * plus récentes d'abord) : c'est un filet de sécurité, pas un mécanisme de
   * rapprochement de masse. Si les webhooks SasPay transportent bien
   * `metadata`, il ne s'exécutera jamais.
   */
  private async resolveMerchantReference(data: {
    id: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<string | null> {
    const direct = data.metadata?.reference;
    if (typeof direct === "string" && direct.length > 0) {
      return direct;
    }

    let url: string | null = `${API_BASE_URL}/checkout-sessions/?page_size=${SESSION_PAGE_SIZE}`;

    for (let page = 0; page < MAX_SESSION_PAGES && url; page++) {
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${this.secretKey}` },
          cache: "no-store",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        console.error("[SasPayProvider] échec du rapprochement par listage des sessions", error);
        return null;
      }

      if (!response.ok) {
        console.error(
          `[SasPayProvider] listage des sessions refusé (HTTP ${response.status})`
        );
        return null;
      }

      const parsed = sessionListSchema.safeParse(
        unwrapEnvelope(await response.json().catch(() => null))
      );
      if (!parsed.success) {
        console.error("[SasPayProvider] réponse de listage des sessions inattendue");
        return null;
      }

      const match = parsed.data.results.find((session) => session.transaction === data.id);
      const reference = match?.metadata?.reference;
      if (typeof reference === "string" && reference.length > 0) {
        return reference;
      }

      url = parsed.data.next ?? null;
    }

    return null;
  }
}
