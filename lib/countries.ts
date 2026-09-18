/**
 * Présentation des pays dans l'interface.
 *
 * Les noms stockés en base sont en anglais ("United States", "South Africa") :
 * ils viennent du seed et servent aussi de repère pour les fournisseurs. Les
 * afficher tels quels dans une interface française rend les pays introuvables —
 * un client cherche "États-Unis", jamais "United States", et conclut que le
 * pays est absent du catalogue.
 *
 * Le nom affiché est donc dérivé du code ISO, seule donnée fiable et déjà
 * utilisée pour parler aux fournisseurs.
 */

const frenchRegionNames = new Intl.DisplayNames(["fr"], { type: "region" });

/**
 * Pays à fort volume, épinglés en tête du sélecteur. L'ordre de ce tableau est
 * celui de l'affichage : la liste complète compte 88 entrées, et un client qui
 * doit la parcourir pour trouver les destinations les plus courantes abandonne.
 */
export const PRIORITY_COUNTRY_CODES = [
  "US",
  "GB",
  "FR",
  "CA",
  "BR",
  "IN",
  "ID",
  "NG",
  "ZA",
] as const;

/**
 * Nom français d'un pays à partir de son code ISO 3166-1 alpha-2.
 * `fallback` (le nom stocké en base) couvre un code qu'ICU ne connaîtrait pas.
 */
export function toFrenchCountryName(isoCode: string, fallback: string): string {
  try {
    const name = frenchRegionNames.of(isoCode);
    // ICU renvoie le code lui-même quand il ne connaît pas la région.
    return name && name !== isoCode ? name : fallback;
  } catch {
    return fallback;
  }
}

interface SortableCountry {
  code: string;
  name: string;
}

/**
 * Trie les pays pour l'affichage : les prioritaires d'abord, dans l'ordre de
 * PRIORITY_COUNTRY_CODES, puis tous les autres par ordre alphabétique français
 * (qui place correctement les accents : "Égypte" avec les E, pas en fin de
 * liste).
 */
export function sortCountriesForDisplay<T extends SortableCountry>(countries: T[]): T[] {
  const priority = PRIORITY_COUNTRY_CODES as readonly string[];

  return [...countries].sort((a, b) => {
    const rankA = priority.indexOf(a.code);
    const rankB = priority.indexOf(b.code);

    if (rankA !== -1 && rankB !== -1) return rankA - rankB;
    if (rankA !== -1) return -1;
    if (rankB !== -1) return 1;

    return a.name.localeCompare(b.name, "fr");
  });
}

/** Vrai si ce pays doit apparaître dans le groupe "Les plus demandés". */
export function isPriorityCountry(isoCode: string): boolean {
  return (PRIORITY_COUNTRY_CODES as readonly string[]).includes(isoCode);
}
