/**
 * Synchronise le catalogue (prix et disponibilité) sur l'inventaire RÉEL de
 * GrizzlySMS, désormais fournisseur exclusif des achats.
 *
 * L'ancien scripts/sync-catalog.ts tarifait sur les prix 5sim : une fois les
 * achats basculés sur GrizzlySMS, de nombreux couples se retrouvaient vendus
 * sous leur coût (ex. twitter/VN : 20 FCFA de vente pour 36 FCFA de coût) et
 * le garde-fou marge les refusait tous.
 *
 * Un appel getPrices par service (tous pays d'un coup), aucun crédit consommé.
 * Seuls les couples existants sont touchés ; les pays sont (dés)activés selon
 * qu'il leur reste au moins un service vendable.
 *
 *   npm run sync-catalog               # simulation
 *   npm run sync-catalog -- --apply    # écriture en base
 */
import "dotenv/config";

import { computeSellingPriceFcfa } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { resolveGrizzlyCountryId, SERVICE_CODES } from "@/lib/providers/GrizzlySmsProvider";

const APPLY = process.argv.includes("--apply");
const BASE_URL = "https://api.grizzlysms.com/stubs/handler_api.php";

type PriceMap = Record<string, Record<string, { cost: number; count: number }>>;

async function fetchPrices(serviceCode: string): Promise<PriceMap> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", process.env.GRIZZLY_API_KEY ?? "");
  url.searchParams.set("action", "getPrices");
  url.searchParams.set("service", serviceCode);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return (await response.json()) as PriceMap;
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
    prisma.countryService.findMany({ select: { id: true, countryId: true, serviceId: true, price: true, isActive: true } }),
  ]);

  const countryIds = new Map<string, string | undefined>();
  for (const country of countries) countryIds.set(country.id, await resolveGrizzlyCountryId(country.code));

  const updates: { id: string; price: number; isActive: boolean }[] = [];
  const sellableCountries = new Set<string>();
  const preview: string[] = [];

  for (const service of services) {
    const code = SERVICE_CODES[service.slug];
    const prices = code ? await fetchPrices(code) : {};

    for (const pair of pairs.filter((p) => p.serviceId === service.id)) {
      const gid = countryIds.get(pair.countryId);
      const entry = code && gid ? prices[gid]?.[code] : undefined;
      if (!entry || entry.count <= 0 || !Number.isFinite(entry.cost)) {
        updates.push({ id: pair.id, price: Number(pair.price), isActive: false });
        continue;
      }
      const price = computeSellingPriceFcfa(entry.cost);
      updates.push({ id: pair.id, price, isActive: true });
      sellableCountries.add(pair.countryId);
      if (preview.length < 15 || service.slug === "twitter") {
        const iso = countries.find((c) => c.id === pair.countryId)?.code;
        if (preview.length < 25) preview.push(`  ${iso}/${service.slug.padEnd(10)} coût ${entry.cost} USD | stock ${entry.count} | ${pair.price} -> ${price} FCFA`);
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
