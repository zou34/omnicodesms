import { MockEmailProvider } from "@/lib/email/MockEmailProvider";
import type { EmailProvider } from "@/lib/email/EmailProvider";

export { EmailProvider } from "@/lib/email/EmailProvider";

const EMAIL_PROVIDERS = {
  mock: () => new MockEmailProvider(),
  // Add a real provider here once chosen, e.g.:
  //   resend: () => new ResendEmailProvider(),
  // Nothing else needs to change — app/api/auth/forgot-password/route.ts
  // only ever calls EmailProvider's interface method.
} satisfies Record<string, () => EmailProvider>;

export type EmailProviderName = keyof typeof EMAIL_PROVIDERS;

const globalForEmailProvider = globalThis as unknown as {
  emailProvider: EmailProvider | undefined;
};

/**
 * Singleton EmailProvider, cached on `globalThis` the same way
 * lib/providers/index.ts and lib/payments/index.ts do.
 *
 * Selection: `EMAIL_PROVIDER` env var if set, else "mock" — no real
 * provider is configured yet.
 */
export function getEmailProvider(): EmailProvider {
  if (globalForEmailProvider.emailProvider) {
    return globalForEmailProvider.emailProvider;
  }

  const providerName = (process.env.EMAIL_PROVIDER as EmailProviderName | undefined) ?? "mock";
  const factory = EMAIL_PROVIDERS[providerName];

  if (!factory) {
    throw new Error(
      `Fournisseur d'email inconnu: "${providerName}". Valeurs possibles: ${Object.keys(EMAIL_PROVIDERS).join(", ")}.`
    );
  }

  const instance = factory();
  globalForEmailProvider.emailProvider = instance;

  return instance;
}
