/**
 * Règle de tarification du catalogue — source unique de vérité.
 *
 *   Prix de vente (FCFA) = ⌈ (coût réf. (USD) × USD_TO_FCFA × PRICE_MARKUP + FIXED_MARGIN_FCFA) / 10 ⌉ × 10
 *
 * Le coût de référence est le prix médian du stock (voir referenceCostUsd),
 * et l'achat est plafonné chez le fournisseur par maxProviderCostUsd().
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

/**
 * Taux appliqué par le garde-fou marge (lib/providers/margin-guard.ts) pour
 * convertir un coût fournisseur en FCFA au moment de l'achat.
 *
 * Les DEUX fournisseurs libellent leurs tarifs en dollars, pas en roubles —
 * vérifié en direct contre les deux API :
 *   - 5sim        GET /guest/products/france/any -> whatsapp 0.79, google 0.19
 *   - GrizzlySMS  GET ?action=getPrices&country=78&service=go -> cost 0.19
 *                 GET ?action=getBalance -> ACCESS_BALANCE:6.0048
 * Ces montants n'ont de sens qu'en USD : 0,19 RUB vaudrait 0,002 $, soit cent
 * fois moins que le prix plancher du marché.
 *
 * C'est donc bien USD_TO_FCFA qui s'applique — le même taux que celui ayant
 * servi à calculer le prix de vente stocké au catalogue. Comparer un coût et
 * un prix de vente construits avec deux taux différents n'aurait aucun sens.
 *
 * Surcharge possible via PROVIDER_USD_TO_FCFA (lue à l'exécution, pas
 * seulement au build) pour suivre le dollar sans redéployer.
 */
export function getProviderUsdToFcfa(): number {
  const envVal = Number(process.env.PROVIDER_USD_TO_FCFA);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : USD_TO_FCFA;
}

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
  const raw = Math.round((costUsd * usdToFcfa * markup + FIXED_MARGIN_FCFA) * 1e6) / 1e6;
  return Math.ceil(raw / ROUNDING_STEP) * ROUNDING_STEP;
}

/**
 * Marge fixe ajoutée à chaque prix de vente. Couvre les frais de passerelle
 * de paiement et garantit qu'aucun numéro "à 0,01 $" ne se vende à perte.
 */
export const FIXED_MARGIN_FCFA = 50;

/**
 * Marge brute minimale garantie à l'achat : le coût fournisseur ne peut
 * jamais dépasser prix de vente / 1,25 (soit ≥ 20 % de marge).
 */
export const MIN_MARGIN_RATIO = 1.25;

/**
 * Plafond de coût fournisseur (USD) acceptable pour un prix de vente donné.
 *
 * Transmis tel quel à GrizzlySMS (`getNumber&maxPrice=`) : c'est le
 * fournisseur lui-même qui refuse tout numéro plus cher, au moment exact de
 * l'achat — aucune dérive de prix entre deux synchros ne peut donc produire
 * une vente à perte. Avec la formule ci-dessus, ce plafond vaut ~2 × le coût
 * de référence : les ventes continuent même si le fournisseur double ses prix.
 */
export function maxProviderCostUsd(sellingPriceFcfa: number): number {
  const ceiling = sellingPriceFcfa / (getProviderUsdToFcfa() * MIN_MARGIN_RATIO);
  // Arrondi au centime INFÉRIEUR : jamais au-dessus du plafond.
  return Math.floor(ceiling * 100) / 100;
}

/**
 * Coût de référence d'un couple pays/service à partir de la répartition de
 * son stock par palier de prix ({ "0.19": 40, "0.59": 295 }).
 *
 * Le prix plancher affiché par getPrices ne concerne souvent qu'une poignée
 * de numéros (ex. Google/France : 40 à 0,19 $, contre des centaines à
 * 0,28–0,59 $) : tarifer dessus rendait le catalogue invendable dès que ces
 * quelques numéros étaient partis. On prend donc le palier MÉDIAN — celui où
 * l'on atteint la moitié du stock, par prix croissant.
 */
export function referenceCostUsd(tiers: Record<string, number>): number | null {
  const sorted = Object.entries(tiers)
    .map(([price, count]) => ({ price: Number(price), count: Number(count) }))
    .filter((t) => Number.isFinite(t.price) && t.price > 0 && t.count > 0)
    .sort((a, b) => a.price - b.price);

  const total = sorted.reduce((sum, t) => sum + t.count, 0);
  if (total === 0) return null;

  let cumulative = 0;
  for (const tier of sorted) {
    cumulative += tier.count;
    if (cumulative >= total / 2) return tier.price;
  }
  return sorted[sorted.length - 1].price;
}
