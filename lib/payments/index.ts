import { MockPaymentProvider } from "@/lib/payments/MockPaymentProvider";
import type { PaymentProvider } from "@/lib/payments/PaymentProvider";
import { SasPayProvider } from "@/lib/payments/SasPayProvider";

export { PaymentProvider } from "@/lib/payments/PaymentProvider";
export * from "@/lib/payments/types";

const PAYMENT_PROVIDERS = {
  mock: () => new MockPaymentProvider(),
  // SasPay : enregistré, mais ses deux méthodes lèvent encore une erreur
  // explicite tant que la documentation n'est pas intégrée. Ne basculez
  // PAYMENT_PROVIDER sur "saspay" qu'une fois SasPayProvider implémenté —
  // d'ici là, toute tentative de paiement échouera en 500 (la transaction
  // étant correctement repassée en FAILED par la route checkout).
  saspay: () => new SasPayProvider(),
  // Rien d'autre ne change en ajoutant un fournisseur ici :
  // app/api/payments/checkout/route.ts et app/api/webhooks/payment/route.ts
  // n'appellent jamais que les méthodes du contrat PaymentProvider.
} satisfies Record<string, () => PaymentProvider>;

export type PaymentProviderName = keyof typeof PAYMENT_PROVIDERS;

const globalForPaymentProvider = globalThis as unknown as {
  paymentProvider: PaymentProvider | undefined;
};

/**
 * Returns a singleton PaymentProvider, cached on `globalThis` the same way
 * lib/prisma.ts and lib/providers/index.ts do.
 *
 * Selection: `PAYMENT_PROVIDER` env var if set, else "mock" — there's no
 * key-based auto-detection yet since no real aggregator is configured.
 * Once one is (e.g. `PAYMENT_PROVIDER=cinetpay`), it becomes the default.
 */
export function getPaymentProvider(): PaymentProvider {
  if (globalForPaymentProvider.paymentProvider) {
    return globalForPaymentProvider.paymentProvider;
  }

  const providerName = (process.env.PAYMENT_PROVIDER as PaymentProviderName | undefined) ?? "mock";
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
