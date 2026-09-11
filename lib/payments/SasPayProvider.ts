import { PaymentProvider } from "@/lib/payments/PaymentProvider";
import type {
  InitializePaymentParams,
  InitializePaymentResult,
  WebhookVerificationResult,
} from "@/lib/payments/types";

/**
 * Intégration SasPay — SQUELETTE, pas encore implémenté.
 *
 * Les deux méthodes lèvent volontairement une erreur tant que la
 * documentation SasPay n'est pas intégrée : mieux vaut un échec bruyant
 * qu'un faux succès qui créditerait un solde sans paiement réel. Ce
 * fournisseur n'est d'ailleurs pas encore enregistré dans
 * lib/payments/index.ts, donc `PAYMENT_PROVIDER=saspay` est aujourd'hui
 * refusé au démarrage — l'enregistrement se fera en même temps que
 * l'implémentation.
 *
 * Rien d'autre dans l'application n'aura à changer : les routes
 * app/api/payments/checkout et app/api/webhooks/payment ne parlent qu'au
 * contrat PaymentProvider, jamais à un SDK concret.
 */
export class SasPayProvider extends PaymentProvider {
  readonly name = "saspay";

  /**
   * Doit créer une session de paiement hébergée chez SasPay et renvoyer
   * l'URL vers laquelle rediriger le navigateur.
   *
   * À renseigner depuis la documentation :
   *   - endpoint et méthode HTTP de création de session ;
   *   - en-tête d'authentification (clé API / bearer token) ;
   *   - nom du champ portant NOTRE référence (params.reference) — c'est
   *     lui qui doit revenir dans le webhook, sinon la confirmation ne
   *     peut pas être rattachée à la bonne transaction ;
   *   - unité du montant attendue (FCFA entier, ou centimes) ;
   *   - nom du champ contenant l'URL de paiement dans la réponse.
   *
   * En cas d'indisponibilité de la passerelle, lever
   * `new PaymentProviderError(message, "GATEWAY_UNAVAILABLE")` : la route
   * checkout la traduit alors en 502 et repasse la transaction en FAILED.
   */
  // Signatures conservées telles quelles : elles servent de gabarit pour
  // l'implémentation à venir, d'où les paramètres encore inutilisés.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    throw new Error(
      "SasPayProvider.initializePayment n'est pas encore implémenté (documentation SasPay en attente)."
    );
  }

  /**
   * Doit vérifier la signature de la notification entrante, puis extraire
   * l'événement (référence, statut, montant).
   *
   * `rawBody` est le corps BRUT de la requête, volontairement non parsé :
   * les signatures se calculent sur les octets exacts envoyés, et
   * JSON.stringify(JSON.parse(body)) ne les reproduit pas forcément.
   *
   * À renseigner depuis la documentation :
   *   - nom de l'en-tête portant la signature ;
   *   - algorithme et secret utilisés (probablement HMAC-SHA256 sur une
   *     clé de webhook dédiée) ;
   *   - sur quoi la signature est calculée : le corps seul, ou une
   *     concaténation (timestamp + corps) — auquel cas il faut aussi
   *     rejeter les horodatages trop anciens pour bloquer le rejeu ;
   *   - forme du payload et valeurs de statut, à valider avec Zod.
   *
   * Comparer les signatures avec `timingSafeEqual` de `crypto`, jamais
   * avec `===` — voir MockPaymentProvider.isSignatureValid pour le
   * schéma exact déjà en place.
   *
   * Retours attendus :
   *   - signature absente/invalide  -> { valid: false, reason: "INVALID_SIGNATURE" }
   *   - corps illisible             -> { valid: false, reason: "MALFORMED_BODY" }
   *   - forme non reconnue          -> { valid: false, reason: "UNRECOGNIZED_PAYLOAD" }
   *   - succès                      -> { valid: true, event: { reference, status, amountFcfa } }
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerificationResult> {
    throw new Error(
      "SasPayProvider.verifyWebhook n'est pas encore implémenté (documentation SasPay en attente)."
    );
  }
}
