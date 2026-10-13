import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

import { PaymentProvider } from "@/lib/payments/PaymentProvider";
import {
  PaymentProviderError,
  type InitializePaymentParams,
  type InitializePaymentResult,
  type PaymentEventStatus,
  type VerifiedPaymentEvent,
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

// Création de session : délai par tentative, deux tentatives au plus (voir
// initializePayment). 2 × 12 s + pause tient dans le maxDuration (30 s) de la
// route de checkout, avec de la marge pour les écritures en base.
const SESSION_CREATE_TIMEOUT_MS = 12_000;

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

    // Une seconde tentative si SasPay est injoignable ou répond 429/5xx : une
    // micro-coupure ne doit pas coûter un paiement au client. Sans risque —
    // une session créée deux fois n'est jamais payée deux fois, seule celle
    // dont l'URL est renvoyée au navigateur sert. Les deux tentatives tiennent
    // dans le maxDuration de app/api/payments/checkout/route.ts.
    const createSession = () =>
      fetch(`${API_BASE_URL}/checkout-sessions/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(SESSION_CREATE_TIMEOUT_MS),
      });

    let response: Response | null = null;
    let networkError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await createSession();
        networkError = null;
        if (response.ok || (response.status !== 429 && response.status < 500)) break;
      } catch (error) {
        networkError = error;
      }
      if (attempt === 1) {
        console.warn(
          `[SasPayProvider] création de session : ${networkError ? "SasPay injoignable" : `HTTP ${response?.status}`}, nouvelle tentative`
        );
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    if (!response) {
      throw new PaymentProviderError(
        `SasPay est injoignable: ${networkError instanceof Error ? networkError.message : "erreur réseau"}.`,
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

    let reference: string | null;
    let amountFcfa: number | undefined;

    if (!data.currency || data.currency.toUpperCase() === CURRENCY.toUpperCase()) {
      reference = await this.resolveMerchantReference(data);
      // `data.amount` est le montant DEMANDÉ, pas ce que le payeur a déboursé
      // (`charged`, qui inclut les frais en mode ADD_ON). C'est bien `amount`
      // qu'il faut comparer à notre Transaction.amount, qui stocke le prix du
      // pack hors frais de passerelle.
      amountFcfa = data.amount !== undefined ? Number(data.amount) : undefined;
    } else {
      // Paiement réglé dans une autre devise : SasPay convertit la session
      // (ex. crypto : 5 000 XOF -> 8,81 USD) et l'event porte le montant
      // converti. Le comparer tel quel au prix du pack, ou le rejeter,
      // ferait payer le client sans le créditer. On rapproche donc sur la
      // session d'origine, lue à la source chez SasPay : c'est elle qui doit
      // être en XOF et au montant de notre transaction.
      const session = await this.fetchOriginSession(data.id);
      if (!session || session.currency.toUpperCase() !== CURRENCY.toUpperCase()) {
        console.error(
          `[SasPayProvider] transaction ${data.id} en ${data.currency} : session d'origine ` +
            `introuvable ou hors ${CURRENCY}`
        );
        return { valid: false, reason: "UNRECOGNIZED_PAYLOAD" };
      }
      const direct = data.metadata?.reference;
      reference =
        typeof direct === "string" && direct.length > 0
          ? direct
          : typeof session.metadata?.reference === "string"
            ? session.metadata.reference
            : null;
      amountFcfa = Number(session.amount);
    }

    if (!reference) {
      console.error(
        `[SasPayProvider] impossible de rattacher la transaction SasPay ${data.id} à une référence marchand`
      );
      return { valid: false, reason: "UNRECOGNIZED_PAYLOAD" };
    }

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
   * Sessions de checkout PAYÉES depuis `since`, pour le rapprochement
   * quotidien. La liste SasPay est triée de la plus récente à la plus
   * ancienne : on s'arrête à la première session antérieure à `since`, ou
   * après MAX_SESSION_PAGES pages.
   *
   * Le montant renvoyé est celui de la SESSION, en XOF : c'est lui que nous
   * avons demandé, quel que soit le moyen de paiement (y compris crypto).
   */
  async listSucceededPayments(since: Date): Promise<VerifiedPaymentEvent[]> {
    const paidSessionSchema = z.object({
      next: z.string().nullish(),
      results: z.array(
        z.object({
          status: z.string(),
          amount: z.string(),
          currency: z.string(),
          created_at: z.string(),
          metadata: z.record(z.string(), z.unknown()).nullish(),
        })
      ),
    });

    const events: VerifiedPaymentEvent[] = [];
    let url: string | null = `${API_BASE_URL}/checkout-sessions/?page_size=${SESSION_PAGE_SIZE}`;

    for (let page = 0; page < MAX_SESSION_PAGES && url; page++) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.secretKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Listage des sessions SasPay refusé (HTTP ${response.status})`);

      const parsed = paidSessionSchema.safeParse(unwrapEnvelope(await response.json().catch(() => null)));
      if (!parsed.success) throw new Error("Réponse de listage des sessions SasPay inattendue");

      let reachedSince = false;
      for (const session of parsed.data.results) {
        if (new Date(session.created_at) < since) {
          reachedSince = true;
          break;
        }
        const reference = session.metadata?.reference;
        if (session.status !== "PAID" || typeof reference !== "string" || reference.length === 0) continue;
        if (session.currency.toUpperCase() !== CURRENCY.toUpperCase()) continue;

        const amountFcfa = Number(session.amount);
        events.push({ reference, status: "SUCCESS", amountFcfa: Number.isFinite(amountFcfa) ? amountFcfa : undefined });
      }

      url = reachedSince ? null : (parsed.data.next ?? null);
    }

    return events;
  }

  /**
   * Session de checkout à l'origine d'une transaction SasPay, lue via l'API :
   * GET /transactions/{id}/ donne `checkout_session`, puis
   * GET /checkout-sessions/{id}/ donne le montant et la devise demandés.
   *
   * Une erreur réseau ou HTTP est levée, pas convertie en null : la route
   * répond alors 500 et SasPay relance, au lieu de perdre le paiement.
   */
  private async fetchOriginSession(transactionId: string): Promise<{
    amount: string;
    currency: string;
    metadata?: Record<string, unknown> | null;
  } | null> {
    const get = async (path: string): Promise<unknown> => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${this.secretKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`SasPay ${path} : HTTP ${response.status}`);
      return unwrapEnvelope(await response.json());
    };

    const transaction = z
      .object({ checkout_session: z.string().nullish() })
      .safeParse(await get(`/transactions/${encodeURIComponent(transactionId)}/`));
    const sessionId = transaction.success ? transaction.data.checkout_session : null;
    if (!sessionId) return null;

    const session = z
      .object({
        amount: z.string(),
        currency: z.string(),
        metadata: z.record(z.string(), z.unknown()).nullish(),
      })
      .safeParse(await get(`/checkout-sessions/${encodeURIComponent(sessionId)}/`));
    return session.success ? session.data : null;
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
        // Levée et non `return null` : la route répond alors 500 et SasPay
        // relance. Un null ferait répondre 200 et perdrait définitivement ce
        // paiement, pour un simple incident passager.
        console.error("[SasPayProvider] échec du rapprochement par listage des sessions", error);
        throw error;
      }

      if (!response.ok) {
        console.error(
          `[SasPayProvider] listage des sessions refusé (HTTP ${response.status})`
        );
        throw new Error(`Listage des sessions SasPay refusé (HTTP ${response.status})`);
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
