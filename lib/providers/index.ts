import { MockProvider } from "@/lib/providers/MockProvider";
import { RealSmsProvider } from "@/lib/providers/RealSmsProvider";
import type { SmsProvider } from "@/lib/providers/SmsProvider";

export { SmsProvider } from "@/lib/providers/SmsProvider";
export * from "@/lib/providers/types";

const PROVIDERS = {
  mock: () => new MockProvider(),
  real: () => new RealSmsProvider(),
} satisfies Record<string, () => SmsProvider>;

export type ProviderName = keyof typeof PROVIDERS;

const globalForProvider = globalThis as unknown as {
  smsProvider: SmsProvider | undefined;
};

/**
 * Returns a singleton SmsProvider. Singleton because MockProvider keeps
 * rented orders in memory — a fresh instance per call would forget every
 * order as soon as it was created. In dev with hot-reload, the instance
 * is cached on `globalThis` the same way `lib/prisma.ts` caches
 * PrismaClient.
 *
 * Selection:
 *   - `SMS_PROVIDER` set explicitly ("mock" | "real") always wins — lets
 *     you force either one regardless of what else is configured (e.g.
 *     force "real" with no API key to exercise the graceful-failure path).
 *   - Otherwise: "real" if SMS_PROVIDER_API_KEY is set, "mock" if not.
 */
export function getSmsProvider(): SmsProvider {
  if (globalForProvider.smsProvider) {
    return globalForProvider.smsProvider;
  }

  const defaultProviderName: ProviderName = process.env.SMS_PROVIDER_API_KEY ? "real" : "mock";
  const providerName = (process.env.SMS_PROVIDER as ProviderName | undefined) ?? defaultProviderName;
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
