import { FiveSimProvider } from "@/lib/providers/FiveSimProvider";
import { GrizzlySmsProvider } from "@/lib/providers/GrizzlySmsProvider";
import { MockProvider } from "@/lib/providers/MockProvider";
import type { SmsProvider } from "@/lib/providers/SmsProvider";

export { SmsProvider } from "@/lib/providers/SmsProvider";
export * from "@/lib/providers/types";

const PROVIDERS = {
  mock: () => new MockProvider(),
  "5sim": () => new FiveSimProvider(),
  grizzly: () => new GrizzlySmsProvider(),
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
 *   - `SMS_PROVIDER` set explicitly ("mock" | "5sim" | "grizzly") always
 *     wins — lets you force any of them regardless of what keys are set.
 *   - Otherwise, auto-detected from whichever API key is present:
 *     SIM5_API_KEY -> "5sim", else GRIZZLY_API_KEY -> "grizzly", else
 *     "mock". 5sim wins the tie-break if both are set — override with
 *     SMS_PROVIDER=grizzly to prefer the other one.
 */
export function getSmsProvider(): SmsProvider {
  if (globalForProvider.smsProvider) {
    return globalForProvider.smsProvider;
  }

  const defaultProviderName: ProviderName = process.env.SIM5_API_KEY
    ? "5sim"
    : process.env.GRIZZLY_API_KEY
      ? "grizzly"
      : "mock";
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
