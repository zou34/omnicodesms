import type { PaymentProvider } from "@/lib/payments/PaymentProvider";
import { SasPayProvider } from "@/lib/payments/SasPayProvider";

export { PaymentProvider } from "@/lib/payments/PaymentProvider";
export * from "@/lib/payments/types";

// SasPay est le seul moyen de créditer un solde. Il n'existe volontairement
// aucun fournisseur simulé ici : tout encaissement passe par une session de
// checkout réelle, confirmée par un webhook SasPay dont la signature est
// vérifiée (app/api/webhooks/payment/route.ts).
//
// Rien d'autre ne change en ajoutant un fournisseur ici :
// app/api/payments/checkout/route.ts et app/api/webhooks/payment/route.ts
// n'appellent jamais que les méthodes du contrat PaymentProvider.
const PAYMENT_PROVIDERS = {
  saspay: () => new SasPayProvider(),
} satisfies Record<string, () => PaymentProvider>;

export type PaymentProviderName = keyof typeof PAYMENT_PROVIDERS;

const globalForPaymentProvider = globalThis as unknown as {
  paymentProvider: PaymentProvider | undefined;
};

/**
 * Returns a singleton PaymentProvider, cached on `globalThis` the same way
 * lib/prisma.ts and lib/providers/index.ts do.
 *
 * Sélection : la variable `PAYMENT_PROVIDER` si elle est définie, sinon
 * "saspay". Le défaut est un vrai fournisseur, jamais une simulation : une
 * variable oubliée ne doit pas pouvoir faire retomber l'application sur un
 * mode où l'argent serait fictif.
 */
export function getPaymentProvider(): PaymentProvider {
  if (globalForPaymentProvider.paymentProvider) {
    return globalForPaymentProvider.paymentProvider;
  }

  const providerName =
    (process.env.PAYMENT_PROVIDER as PaymentProviderName | undefined) || "saspay";
  const factory = PAYMENT_PROVIDERS[providerName];

  if (!factory) {
    throw new Error(
      `Fournisseur de paiement inconnu: "${providerName}". Valeurs possibles: ${Object.keys(PAYMENT_PROVIDERS).join(", ")}.`
    );
  }

  const instance = factory();
  globalForPaymentProvider.paymentProvider = instance;

  return instance;
}
