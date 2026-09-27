import type { PromoCode } from "@prisma/client";

import { formatFcfa } from "@/lib/packs";
import { prisma } from "@/lib/prisma";
import { describePromo, computePromoBonus, normalizePromoCode, PROMO_CODE_MAX_LENGTH } from "@/lib/promo-rules";

export { PROMO_CODE_MAX_LENGTH } from "@/lib/promo-rules";

/**
 * Codes promo : un BONUS de crédit ajouté à une recharge, jamais une remise
 * sur le montant payé. SasPay encaisse toujours le prix exact du palier, ce
 * qui garde intact le contrôle de montant du webhook.
 *
 * Deux moments de vérification :
 *  - au checkout (validatePromoCode) : code actif, non expiré, montant
 *    minimum atteint, pas déjà utilisé par ce client, quota non épuisé ;
 *  - à la confirmation du paiement (webhook) : le quota et l'unicité par
 *    client sont revérifiés de façon atomique, car deux paiements peuvent
 *    être en cours en même temps avec le même code.
 */

export type PromoValidation =
  | { ok: true; promo: PromoCode; bonusFcfa: number | null; label: string }
  | { ok: false; error: string };

/**
 * `rechargeFcfa` null = vérification du code seul (aperçu dans le modal,
 * avant le choix du palier) : le montant minimum et le bonus sont alors
 * évalués par palier côté client, puis revérifiés ici au checkout.
 */
export async function validatePromoCode(
  rawCode: string,
  userId: string,
  rechargeFcfa: number | null
): Promise<PromoValidation> {
  const code = normalizePromoCode(rawCode);
  if (!code || code.length > PROMO_CODE_MAX_LENGTH) {
    return { ok: false, error: "Code promo invalide." };
  }

  const promo = await prisma.promoCode.findUnique({ where: { code } });

  // Même message pour un code inexistant ou désactivé : ne pas aider à
  // deviner quels codes existent.
  if (!promo || !promo.isActive) {
    return { ok: false, error: "Code promo invalide." };
  }
  if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "Ce code promo a expiré." };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { ok: false, error: "Ce code promo a atteint sa limite d'utilisation." };
  }
  if (rechargeFcfa !== null && rechargeFcfa < promo.minRechargeFcfa) {
    return {
      ok: false,
      error: `Ce code est valable à partir d'une recharge de ${formatFcfa(promo.minRechargeFcfa)}.`,
    };
  }

  const alreadyUsed = await prisma.promoRedemption.findUnique({
    where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
    select: { id: true },
  });
  if (alreadyUsed) {
    return { ok: false, error: "Vous avez déjà utilisé ce code promo." };
  }

  const bonusFcfa = rechargeFcfa === null ? null : computePromoBonus(promo, rechargeFcfa);
  if (bonusFcfa !== null && bonusFcfa <= 0) {
    return { ok: false, error: "Code promo invalide." };
  }

  return { ok: true, promo, bonusFcfa, label: describePromo(promo) };
}
