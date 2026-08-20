import { FiveSimProvider } from "@/lib/providers/FiveSimProvider";
import { GrizzlySmsProvider } from "@/lib/providers/GrizzlySmsProvider";
import { MockProvider } from "@/lib/providers/MockProvider";
import { SmartSmsProvider } from "@/lib/providers/SmartSmsProvider";
import type { SmsProvider } from "@/lib/providers/SmsProvider";

export { SmsProvider } from "@/lib/providers/SmsProvider";
export * from "@/lib/providers/types";

const PROVIDERS = {
  mock: () => new MockProvider(),
  "5sim": () => new FiveSimProvider(),
  grizzly: () => new GrizzlySmsProvider(),
  // 5sim primary, GrizzlySMS secondary fallback on any error (out of
  // stock, insufficient balance, API failure) — see SmartSmsProvider.
  smart: () => new SmartSmsProvider(),
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
 *   - `SMS_PROVIDER` set explicitly ("mock" | "5sim" | "grizzly" | "smart")
 *     always wins — lets you force any of them regardless of what keys
 *     are set.
 *   - Otherwise, auto-detected from which API keys are present: both
 *     SIM5_API_KEY and GRIZZLY_API_KEY -> "smart" (5sim primary,
 *     GrizzlySMS fallback), only one of them -> that single provider,
 *     neither -> "mock".
 */
export function getSmsProvider(): SmsProvider {
  if (globalForProvider.smsProvider) {
    return globalForProvider.smsProvider;
  }

  const hasFiveSim = Boolean(process.env.SIM5_API_KEY);
  const hasGrizzly = Boolean(process.env.GRIZZLY_API_KEY);

  const defaultProviderName: ProviderName =
    hasFiveSim && hasGrizzly ? "smart" : hasFiveSim ? "5sim" : hasGrizzly ? "grizzly" : "mock";
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
