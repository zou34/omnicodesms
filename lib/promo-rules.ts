import { formatFcfa } from "@/lib/packs";

/**
 * Règles de calcul des codes promo, sans accès base : importables côté client
 * (aperçu du bonus dans le modal de recharge) comme côté serveur.
 */

export interface PromoRules {
  type: "PERCENT" | "FIXED";
  value: number;
  maxBonusFcfa: number | null;
  minRechargeFcfa: number;
}

export const PROMO_CODE_MAX_LENGTH = 32;

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Bonus en FCFA (entier) qu'un code accorde sur une recharge donnée. */
export function computePromoBonus(
  promo: Pick<PromoRules, "type" | "value" | "maxBonusFcfa">,
  rechargeFcfa: number
): number {
  const raw = promo.type === "PERCENT" ? Math.floor((rechargeFcfa * promo.value) / 100) : promo.value;
  const capped = promo.maxBonusFcfa !== null ? Math.min(raw, promo.maxBonusFcfa) : raw;
  return Math.max(0, capped);
}

export function describePromo(promo: Pick<PromoRules, "type" | "value" | "maxBonusFcfa">): string {
  if (promo.type === "FIXED") return `+${formatFcfa(promo.value)} offerts`;
  const cap = promo.maxBonusFcfa !== null ? ` (max ${formatFcfa(promo.maxBonusFcfa)})` : "";
  return `+${promo.value} % de crédit offert${cap}`;
}

