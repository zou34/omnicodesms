import { FiveSimProvider } from "@/lib/providers/FiveSimProvider";
import { GrizzlySmsProvider } from "@/lib/providers/GrizzlySmsProvider";
import { SmartSmsProvider } from "@/lib/providers/SmartSmsProvider";
import type { SmsProvider } from "@/lib/providers/SmsProvider";

export { SmsProvider } from "@/lib/providers/SmsProvider";
export * from "@/lib/providers/types";

// Uniquement de vrais fournisseurs : aucun numéro ni aucun SMS n'est simulé.
// Un numéro affiché au client correspond toujours à une location réellement
// payée chez 5sim ou GrizzlySMS.
const PROVIDERS = {
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
 * Retourne un SmsProvider en singleton, mis en cache sur `globalThis` comme
 * le fait `lib/prisma.ts` pour PrismaClient (évite d'ouvrir une instance par
 * requête, et survit au hot-reload en développement).
 *
 * Sélection :
 *   - `SMS_PROVIDER` explicite ("5sim" | "grizzly" | "smart") l'emporte
 *     toujours, quelles que soient les clés présentes.
 *   - Sinon, déduit des clés API disponibles : SIM5_API_KEY et
 *     GRIZZLY_API_KEY -> "smart" (5sim en primaire, GrizzlySMS en secours),
 *     une seule -> ce fournisseur.
 *
 * Aucune clé configurée est une erreur de configuration, pas un cas de
 * repli : il n'existe plus de fournisseur simulé vers lequel retomber, et
 * livrer un numéro fictif à un client ayant payé serait pire qu'échouer.
 */
export function getSmsProvider(): SmsProvider {
  if (globalForProvider.smsProvider) {
    return globalForProvider.smsProvider;
  }

  const hasFiveSim = Boolean(process.env.SIM5_API_KEY);
  const hasGrizzly = Boolean(process.env.GRIZZLY_API_KEY);

  const defaultProviderName: ProviderName | undefined =
    hasFiveSim && hasGrizzly ? "smart" : hasFiveSim ? "5sim" : hasGrizzly ? "grizzly" : undefined;
  const providerName =
    (process.env.SMS_PROVIDER as ProviderName | undefined) || defaultProviderName;

  if (!providerName) {
    throw new Error(
      "Aucun fournisseur SMS configuré : renseignez SIM5_API_KEY et/ou GRIZZLY_API_KEY."
    );
  }

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
