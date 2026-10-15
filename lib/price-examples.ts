/**
 * Exemples de prix affichés dans la modale de recharge (« Ce que vous pouvez
 * obtenir avec une recharge de 1 000 FCFA »).
 *
 * Calculés à partir du catalogue réel, jamais écrits en dur : les prix suivent
 * le marché GrizzlySMS à chaque synchro (scripts/sync-catalog-grizzly.ts), et
 * un exemple figé deviendrait faux — un client qui lit « ~150 FCFA » puis
 * découvre 3 800 FCFA se sent trompé.
 *
 * Pour chaque service, l'exemple retenu est le moins cher parmi des pays
 * connus du public (pas un pays exotique qui ne parlerait à personne).
 */

export const EXAMPLE_BUDGET_FCFA = 1000;

const EXAMPLE_SERVICES = [
  { slug: "whatsapp", label: "WhatsApp", emoji: "🟢" },
  { slug: "facebook", label: "Facebook", emoji: "🔵" },
  { slug: "tiktok", label: "TikTok", emoji: "🎵" },
] as const;

// Pays connus de la clientèle (Afrique de l'Ouest et grandes destinations).
const KNOWN_COUNTRIES = ["CA", "GB", "US", "FR", "DE", "BE", "CI", "SN", "ML", "BF", "CM", "NG", "TG", "BJ", "MA"];

export interface PriceExample {
  slug: string;
  label: string;
  emoji: string;
  countryName: string;
  priceFcfa: number;
  /** Numéros obtenables avec EXAMPLE_BUDGET_FCFA. */
  validations: number;
}

export function buildPriceExamples(
  pricing: { countryId: string; serviceId: string; price: number }[],
  countries: { id: string; code: string; name: string }[],
  services: { id: string; slug: string }[]
): PriceExample[] {
  const countryById = new Map(countries.map((c) => [c.id, c]));
  const examples: PriceExample[] = [];

  for (const service of EXAMPLE_SERVICES) {
    const serviceId = services.find((s) => s.slug === service.slug)?.id;
    if (!serviceId) continue;

    let best: { price: number; countryName: string } | null = null;
    for (const entry of pricing) {
      if (entry.serviceId !== serviceId) continue;
      const country = countryById.get(entry.countryId);
      if (!country || !KNOWN_COUNTRIES.includes(country.code)) continue;
      if (!best || entry.price < best.price) best = { price: entry.price, countryName: country.name };
    }

    // Un exemple qui ne permettrait même pas un numéro n'a rien de rassurant.
    if (!best || best.price <= 0 || best.price > EXAMPLE_BUDGET_FCFA) continue;
    examples.push({
      slug: service.slug,
      label: service.label,
      emoji: service.emoji,
      countryName: best.countryName,
      priceFcfa: best.price,
      validations: Math.floor(EXAMPLE_BUDGET_FCFA / best.price),
    });
  }

  return examples;
}
