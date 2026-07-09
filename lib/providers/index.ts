import { MockProvider } from "@/lib/providers/MockProvider";
import type { SmsProvider } from "@/lib/providers/SmsProvider";

export { SmsProvider } from "@/lib/providers/SmsProvider";
export * from "@/lib/providers/types";

// Real providers plug in here once implemented, e.g.:
// import { FiveSimProvider } from "@/lib/providers/FiveSimProvider";
// import { SmsHubProvider } from "@/lib/providers/SmsHubProvider";
const PROVIDERS = {
  mock: () => new MockProvider(),
  // "5sim": () => new FiveSimProvider({ apiKey: process.env.SMS_PROVIDER_API_KEY! }),
  // smshub: () => new SmsHubProvider({ apiKey: process.env.SMS_PROVIDER_API_KEY! }),
} satisfies Record<string, () => SmsProvider>;

export type ProviderName = keyof typeof PROVIDERS;

const globalForProvider = globalThis as unknown as {
  smsProvider: SmsProvider | undefined;
};

/**
 * Returns a singleton SmsProvider chosen via the SMS_PROVIDER env var
 * (defaults to "mock"). Singleton because MockProvider keeps rented
 * orders in memory — a fresh instance per call would forget every order
 * as soon as it was created. In dev with hot-reload, the instance is
 * cached on `globalThis` the same way `lib/prisma.ts` caches PrismaClient.
 */
export function getSmsProvider(): SmsProvider {
  if (globalForProvider.smsProvider) {
    return globalForProvider.smsProvider;
  }

  const providerName = (process.env.SMS_PROVIDER ?? "mock") as ProviderName;
  const factory = PROVIDERS[providerName];

  if (!factory) {
    throw new Error(
      `Provider SMS inconnu: "${providerName}". Valeurs possibles: ${Object.keys(PROVIDERS).join(", ")}.`
    );
  }

  const instance = factory();
  globalForProvider.smsProvider = instance;

  return instance;
}
