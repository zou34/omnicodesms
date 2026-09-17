/**
 * Règle de tarification du catalogue — source unique de vérité.
 *
 *   Prix de vente (FCFA) = ⌈ coût fournisseur (USD) × USD_TO_FCFA × PRICE_MARKUP / 10 ⌉ × 10
 *
 * Soit, avec les constantes ci-dessous : coût USD × 600 × 2,5, arrondi à la
 * dizaine de FCFA SUPÉRIEURE (314 -> 320, 1352 -> 1360). L'arrondi vers le
 * haut garantit que le prix de vente ne repasse jamais sous le coût majoré.
 *
 * Ce prix est calculé une fois par scripts/sync-catalog.ts puis stocké dans
 * CountryService.price. C'est lui que le dashboard affiche et que
 * app/api/orders/route.ts débite du solde de l'utilisateur — jamais le coût
 * fournisseur brut.
 *
 * À ne pas confondre avec lib/packs.ts : celui-ci fixe les montants de
 * RECHARGE du portefeuille (ce que SasPay encaisse), sans marge, puisque
 * 1 FCFA rechargé = 1 FCFA de solde.
 */

/** Conversion appliquée aux prix fournisseur, libellés en dollars. */
export const USD_TO_FCFA = 600;

/** Marge commerciale : 2,5 = prix de vente 2,5 × le coût converti. */
export const PRICE_MARKUP = 2.5;

/** Pas d'arrondi, en FCFA. */
const ROUNDING_STEP = 10;

interface PricingOverrides {
  usdToFcfa?: number;
  markup?: number;
}

/**
 * Applique la règle ci-dessus à un coût fournisseur exprimé en dollars.
 *
 * Les surcharges ne servent qu'à simuler un autre taux ou une autre marge
 * (voir les variables SMS_UNIT_TO_FCFA / SMS_PRICE_MARKUP de
 * scripts/sync-catalog.ts) ; sans elles, la règle par défaut s'applique.
 */
export function computeSellingPriceFcfa(
  costUsd: number,
  { usdToFcfa = USD_TO_FCFA, markup = PRICE_MARKUP }: PricingOverrides = {}
): number {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    throw new RangeError(`Coût fournisseur invalide : ${costUsd}`);
  }

  // L'arithmétique flottante donne 210.00000000000003 pour 0,14 × 600 × 2,5.
  // Sans cette normalisation, l'arrondi supérieur facturerait 220 au lieu de
  // 210 : un pas entier de trop, sur un prix pourtant déjà rond.
  const raw = Math.round(costUsd * usdToFcfa * markup * 1e6) / 1e6;
  const rounded = Math.ceil(raw / ROUNDING_STEP) * ROUNDING_STEP;

  // Un coût nul ou quasi nul ne doit jamais produire un prix de 0 FCFA : ce
  // serait un numéro offert. Plancher à un pas d'arrondi.
  return Math.max(ROUNDING_STEP, rounded);
}
