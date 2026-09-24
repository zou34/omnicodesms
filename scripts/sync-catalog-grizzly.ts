/**
 * Synchronise le catalogue (prix et disponibilité) sur l'inventaire RÉEL de
 * GrizzlySMS, désormais fournisseur exclusif des achats.
 *
 * L'ancien scripts/sync-catalog.ts tarifait sur les prix 5sim : une fois les
 * achats basculés sur GrizzlySMS, de nombreux couples se retrouvaient vendus
 * sous leur coût (ex. twitter/VN : 20 FCFA de vente pour 36 FCFA de coût) et
 * le garde-fou marge les refusait tous.
 *
 * Un appel getPricesV2 par pays (stock par palier de prix), aucun crédit consommé.
 * Seuls les couples existants sont touchés ; les pays sont (dés)activés selon
 * qu'il leur reste au moins un service vendable.
 *
 *   npm run sync-catalog               # simulation
 *   npm run sync-catalog -- --apply    # écriture en base
 */
import "dotenv/config";

import { computeSellingPriceFcfa, maxProviderCostUsd, referenceCostUsd } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { resolveGrizzlyCountryId, SERVICE_CODES } from "@/lib/providers/GrizzlySmsProvider";

const APPLY = process.argv.includes("--apply");
const BASE_URL = "https://api.grizzlysms.com/stubs/handler_api.php";

// getPricesV2 : stock par palier de prix, { "78": { "go": { "0.19": 40, "0.59": 295 } } }.
// getPrices ne donne que le plancher, qui ne concerne souvent qu'une poignée
// de numéros — voir referenceCostUsd() dans lib/pricing.ts.
type TierMap = Record<string, Record<string, Record<string, number>>>;

async function fetchTiers(countryId: string): Promise<TierMap> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", process.env.GRIZZLY_API_KEY ?? "");
  url.searchParams.set("action", "getPricesV2");
  url.searchParams.set("country", countryId);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return ((await response.json()) ?? {}) as TierMap;
    } catch {
      // réessai
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error(`getPricesV2 injoignable pour le pays ${countryId}`);
}

// Repli : pour certains couples, getPricesV2 n'expose aucun palier (ex.
// twitter/VN) alors que getPrices en publie le prix — un seul appel par service.
type FloorMap = Record<string, Record<string, { cost: number; count: number }>>;

async function fetchFloors(serviceCode: string): Promise<FloorMap> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", process.env.GRIZZLY_API_KEY ?? "");
  url.searchParams.set("action", "getPrices");
  url.searchParams.set("service", serviceCode);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return ((await response.json()) ?? {}) as FloorMap;
    } catch {
      // réessai
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error(`getPrices injoignable pour le service ${serviceCode}`);
}

async function main() {
  if (!process.env.GRIZZLY_API_KEY) throw new Error("GRIZZLY_API_KEY manquante.");
  console.log(APPLY ? "=== SYNCHRO GRIZZLY (écriture) ===" : "=== SIMULATION GRIZZLY (aucune écriture) ===");

  const [countries, services, pairs] = await Promise.all([
    prisma.country.findMany(),
    prisma.service.findMany(),
    prisma.countryService.findMany({ select: { id: true, countryId: true, serviceId: true, price: true } }),
  ]);

  const floors = new Map<string, FloorMap>();
  for (const code of Array.from(new Set(Object.values(SERVICE_CODES)))) floors.set(code, await fetchFloors(code));

  const updates: { id: string; price: number; isActive: boolean }[] = [];
  const sellableCountries = new Set<string>();
  const preview: string[] = [];

  for (const country of countries) {
    const gid = await resolveGrizzlyCountryId(country.code);
    const tiers = gid ? (await fetchTiers(gid))[gid] ?? {} : {};

    for (const service of services) {
      const pair = pairs.find((p) => p.countryId === country.id && p.serviceId === service.id);
      if (!pair) continue;

      const code = SERVICE_CODES[service.slug];
      const floor = code && gid ? floors.get(code)?.[gid]?.[code] : undefined;
      const refCost =
        code && tiers[code]
          ? referenceCostUsd(tiers[code])
          : floor && floor.count > 0 && floor.cost > 0
            ? floor.cost
            : null;
      if (refCost === null) {
        updates.push({ id: pair.id, price: Number(pair.price), isActive: false });
        continue;
      }

      const price = computeSellingPriceFcfa(refCost);
      updates.push({ id: pair.id, price, isActive: true });
      sellableCountries.add(country.id);
      if (["FR", "VN", "US", "CI", "NG"].includes(country.code) && ["google", "twitter", "whatsapp", "telegram"].includes(service.slug)) {
        preview.push(
          `  ${country.code}/${service.slug.padEnd(9)} réf ${refCost} $ | ${pair.price} -> ${price} FCFA | plafond achat ${maxProviderCostUsd(price)} $`
        );
      }
    }
  }

  const activated = updates.filter((u) => u.isActive).length;
  console.log(preview.join("\n"));
  console.log(`\ncouples vendables : ${activated} / ${updates.length}`);
  console.log(`pays vendables    : ${sellableCountries.size} / ${countries.length}`);

  if (!APPLY) {
    console.log("\nSimulation uniquement — relancez avec --apply.");
    return;
  }

  // Désactivation d'abord, puis prix, puis activation : un couple n'est jamais
  // actif avec un prix inférieur au coût, même un instant.
  const off = updates.filter((u) => !u.isActive).map((u) => u.id);
  await prisma.countryService.updateMany({ where: { id: { in: off } }, data: { isActive: false } });

  const byPrice = new Map<number, string[]>();
  for (const u of updates.filter((u) => u.isActive)) byPrice.set(u.price, [...(byPrice.get(u.price) ?? []), u.id]);
  for (const [price, ids] of Array.from(byPrice.entries())) {
    await prisma.countryService.updateMany({ where: { id: { in: ids } }, data: { price, isActive: true } });
  }

  await prisma.country.updateMany({ where: { id: { in: Array.from(sellableCountries) } }, data: { isActive: true } });
  await prisma.country.updateMany({ where: { id: { notIn: Array.from(sellableCountries) } }, data: { isActive: false } });
  console.log("Écriture terminée.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
