import { getProviderUsdToFcfa } from "@/lib/pricing";
import { ProviderError } from "@/lib/providers/types";

/**
 * Garde-fou marge — dernier rempart avant de dépenser le solde fournisseur.
 *
 * Le prix affiché au client vient de CountryService.price, un instantané
 * écrit par scripts/sync-catalog.ts. Les tarifs des fournisseurs, eux, bougent
 * en continu avec leur stock. Entre deux synchronisations, un coût peut donc
 * passer au-dessus du prix que nous facturons : sans ce contrôle, chaque vente
 * de ce couple pays/service se ferait à perte, silencieusement, jusqu'à la
 * prochaine synchro.
 *
 * Appelé par les DEUX fournisseurs (voir FiveSimProvider et
 * GrizzlySmsProvider) : 5sim alimente le catalogue mais ne le fige pas, et
 * GrizzlySMS n'a jamais eu de rapport avec lui. Aucun des deux ne peut être
 * présumé rentable.
 */
export function assertPositiveMargin(params: {
  /** Nom du fournisseur, pour les logs uniquement. */
  provider: string;
  country: string;
  service: string;
  /** Coût fournisseur en dollars, ou null s'il n'a pas pu être établi. */
  costUsd: number | null;
  /** Prix de vente catalogue. `undefined` = appel hors tunnel d'achat. */
  sellingPriceFcfa: number | undefined;
}): void {
  const { provider, country, service, costUsd, sellingPriceFcfa } = params;

  // Pas de prix de vente injecté : l'appelant n'est pas un achat client
  // (script de diagnostic, test manuel). Rien à arbitrer.
  if (sellingPriceFcfa === undefined) return;

  // Coût indéterminable (API de tarification en panne). On refuse au lieu de
  // laisser passer : un garde-fou qui s'efface dès que le fournisseur tousse
  // ne protège justement plus au moment où il le faudrait. Une vente ratée
  // coûte une vente ; une vente à perte coûte de l'argent à chaque fois.
  if (costUsd === null || !Number.isFinite(costUsd)) {
    console.error(
      `[${provider}] garde-fou marge: coût indisponible pour ${service}/${country} — achat refusé par précaution.`
    );
    throw new ProviderError(
      `Coût fournisseur indisponible pour ${service}/${country} — achat refusé.`,
      "NO_NUMBERS_AVAILABLE"
    );
  }

  const costFcfa = costUsd * getProviderUsdToFcfa();
  if (costFcfa < sellingPriceFcfa) return;

  console.warn(
    `[${provider}] garde-fou marge: coût ${costUsd} USD = ${costFcfa.toFixed(2)} FCFA ` +
      `>= prix de vente ${sellingPriceFcfa} FCFA pour ${service}/${country} — achat bloqué.`
  );

  // NO_NUMBERS_AVAILABLE et non une nouvelle valeur : côté client le résultat
  // est le même (ce numéro n'est pas vendable maintenant), et le code est déjà
  // traduit en message neutre et en HTTP 409 par app/api/orders/route.ts. Chez
  // SmartSmsProvider, il déclenche aussi le repli vers l'autre fournisseur,
  // qui sera à son tour soumis à ce même contrôle — exactement le
  // comportement voulu.
  throw new ProviderError(
    `Achat bloqué par le garde-fou marge: coût ${costFcfa.toFixed(2)} FCFA >= vente ${sellingPriceFcfa} FCFA.`,
    "NO_NUMBERS_AVAILABLE"
  );
}
