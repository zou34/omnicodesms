import { MockEmailProvider } from "@/lib/email/MockEmailProvider";
import { ResendEmailProvider } from "@/lib/email/ResendEmailProvider";
import type { EmailProvider } from "@/lib/email/EmailProvider";

export { EmailProvider } from "@/lib/email/EmailProvider";

const EMAIL_PROVIDERS = {
  mock: () => new MockEmailProvider(),
  resend: () => new ResendEmailProvider(),
} satisfies Record<string, () => EmailProvider>;

export type EmailProviderName = keyof typeof EMAIL_PROVIDERS;

const globalForEmailProvider = globalThis as unknown as {
  emailProvider: EmailProvider | undefined;
};

/**
 * Singleton EmailProvider, cached on `globalThis` the same way
 * lib/providers/index.ts and lib/payments/index.ts do.
 *
 * Selection: `EMAIL_PROVIDER` env var if set, else auto-detected —
 * "resend" once RESEND_API_KEY is set, "mock" otherwise.
 */
export function getEmailProvider(): EmailProvider {
  if (globalForEmailProvider.emailProvider) {
    return globalForEmailProvider.emailProvider;
  }

  const defaultProviderName: EmailProviderName = process.env.RESEND_API_KEY ? "resend" : "mock";
  const providerName = (process.env.EMAIL_PROVIDER as EmailProviderName | undefined) ?? defaultProviderName;
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
