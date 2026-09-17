/**
 * Synchronise le catalogue (pays, services, prix) avec l'inventaire réel du
 * fournisseur SMS, en appliquant la marge commerciale définie dans
 * lib/pricing.ts.
 *
 * Le catalogue initial venait de prisma/seed.ts : 108 pays x 8 services
 * tarifés arbitrairement, sans lien avec ce que le fournisseur vend
 * réellement. Résultat : des combinaisons proposées à l'écran qui échouent
 * à l'achat, et des prix de vente sans rapport avec nos coûts.
 *
 * Ce script interroge l'endpoint public de 5sim (aucune authentification,
 * aucun crédit consommé), puis :
 *   - crée les couples pays/service manquants (ex. après l'ajout d'un
 *     nouveau service) ;
 *   - désactive tout couple pays/service que le fournisseur ne propose pas
 *     ou dont le stock est nul ;
 *   - (ré)active et retarife ceux qui sont réellement disponibles, au prix
 *     margé calculé par computeSellingPriceFcfa() ;
 *   - désactive les pays dont plus aucun service n'est vendable.
 *
 * Usage :
 *   npm run sync-catalog                                # simulation, n'écrit rien
 *   npm run sync-catalog -- --apply                     # applique les changements
 *   npm run sync-catalog -- --apply --service=youtube   # un seul service
 *
 * --service limite la synchronisation à un service (ex. juste après en avoir
 * ajouté un) : le reste du catalogue n'est ni retarifé ni modifié, et l'état
 * actif/inactif des pays n'est pas touché.
 *
 * Surcharges facultatives, pour simuler un autre barème sans toucher au code :
 *   SMS_UNIT_TO_FCFA   Valeur en FCFA d'UN dollar de coût fournisseur.
 *   SMS_PRICE_MARKUP   Multiplicateur de marge.
 * Absentes, la règle de lib/pricing.ts s'applique telle quelle.
 *
 * Le script est idempotent : on peut le relancer sans risque après un échec
 * réseau, il reconverge vers le même état.
 */
import "dotenv/config";

import { computeSellingPriceFcfa, PRICE_MARKUP, USD_TO_FCFA } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getFiveSimCountrySlugs, toFiveSimProduct } from "@/lib/providers/FiveSimProvider";

const BASE_URL = "https://5sim.net/v1";
const APPLY = process.argv.includes("--apply");
const SERVICE_FILTER =
  process.argv.find((arg) => arg.startsWith("--service="))?.slice("--service=".length) || null;

// Écritures groupées : quelques requêtes vers la base (Francfort) au lieu
// d'une par couple pays/service.
const CHUNK_SIZE = 200;

// `||` et non `??` : une variable vide ou non numérique retombe sur la règle
// par défaut plutôt que de produire un prix aberrant.
const usdToFcfa = Number(process.env.SMS_UNIT_TO_FCFA) || USD_TO_FCFA;
const markup = Number(process.env.SMS_PRICE_MARKUP) || PRICE_MARKUP;

interface ProductEntry {
  Category: string;
  Qty: number;
  Price: number;
}

type ProductsResult =
  | { status: "ok"; products: Record<string, ProductEntry> }
  // Réponse définitive du fournisseur : ce pays n'a pas de catalogue
  // exploitable (ex. le Chili répond HTTP 400 sur l'agrégat "any"). À
  // désactiver, pas à ignorer.
  | { status: "unsupported" }
  // Panne réseau ou erreur serveur : on ne touche à rien plutôt que de
  // désactiver tout un pays sur un incident passager.
  | { status: "unreachable" };

async function fetchProducts(slug: string): Promise<ProductsResult> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/guest/products/${slug}/any`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });

      if (response.ok) {
        return { status: "ok", products: (await response.json()) as Record<string, ProductEntry> };
      }
      if (response.status >= 400 && response.status < 500) {
        return { status: "unsupported" };
      }
    } catch {
      // réessai
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  return { status: "unreachable" };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function loadPairs(serviceIds: string[]) {
  return prisma.countryService.findMany({
    where: { serviceId: { in: serviceIds } },
    select: { id: true, countryId: true, serviceId: true, price: true },
  });
}

// La phase 1 enchaîne des dizaines d'appels à 5sim pendant plusieurs minutes,
// sans aucune requête à la base : le pooler Supabase ferme alors la connexion
// restée inactive, et la première écriture qui suit échoue en P1017 ("Server
// has closed the connection"). Même traitement quand le serveur devient
// momentanément injoignable (P1001), ce qui arrive sur les réseaux dont le
// chemin IPv6 vers Supabase est instable. Chaque écriture est donc retentée
// sur une connexion neuve si celle-ci est tombée.
function isConnectionLost(error: unknown): boolean {
  const { code, name } = error as { code?: string; name?: string };
  return code === "P1017" || code === "P1001" || name === "PrismaClientInitializationError";
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isConnectionLost(error) || attempt >= 4) throw error;
      await prisma.$disconnect();
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function main() {
  console.log(APPLY ? "=== SYNCHRONISATION (écriture) ===" : "=== SIMULATION (aucune écriture) ===");
  console.log(
    `Tarification : prix de vente = coût USD x ${usdToFcfa} x ${markup}, ` +
      "arrondi à la dizaine de FCFA supérieure"
  );

  const slugs = await getFiveSimCountrySlugs();
  const [countries, allServices] = await Promise.all([
    prisma.country.findMany({ orderBy: { code: "asc" } }),
    prisma.service.findMany({ orderBy: { slug: "asc" } }),
  ]);

  const services = SERVICE_FILTER
    ? allServices.filter((service) => service.slug === SERVICE_FILTER)
    : allServices;

  if (SERVICE_FILTER && services.length === 0) {
    console.error(`Service introuvable en base : "${SERVICE_FILTER}".`);
    process.exitCode = 1;
    return;
  }
  if (SERVICE_FILTER) {
    console.log(`Périmètre : service "${SERVICE_FILTER}" uniquement (état des pays inchangé)`);
  }

  const serviceIds = services.map((service) => service.id);
  let pairs = await loadPairs(serviceIds);

  // --- Phase 0 : couples pays/service manquants (nouveau service) ---
  const existing = new Set(pairs.map((p) => `${p.countryId}:${p.serviceId}`));
  const missing = countries.flatMap((country) =>
    services
      .filter((service) => !existing.has(`${country.id}:${service.id}`))
      .map((service) => ({ countryId: country.id, serviceId: service.id }))
  );

  let created = 0;
  if (missing.length > 0 && APPLY) {
    // Créés inactifs à 0 FCFA : la phase 1 ci-dessous les tarifie puis
    // n'active que ceux que le fournisseur a réellement en stock.
    for (const batch of chunk(missing, CHUNK_SIZE)) {
      const result = await withRetry(() =>
        prisma.countryService.createMany({
          data: batch.map((pair) => ({ ...pair, price: 0, isActive: false })),
          skipDuplicates: true,
        })
      );
      created += result.count;
    }
    pairs = await loadPairs(serviceIds);
  }

  const pairByKey = new Map(
    pairs.map((p) => [`${p.countryId}:${p.serviceId}`, { id: p.id, price: Number(p.price) }])
  );

  // --- Phase 1 : tout décider en mémoire (réseau fournisseur uniquement) ---
  const toActivate: string[] = [];
  const toDeactivate: string[] = [];
  const byPrice = new Map<number, string[]>();
  const countriesOn: string[] = [];
  const countriesOff: string[] = [];
  const unmapped: string[] = [];
  const unreadable: string[] = [];
  const preview: string[] = [];

  function deactivateCountry(countryId: string) {
    countriesOff.push(countryId);
    for (const service of services) {
      const pair = pairByKey.get(`${countryId}:${service.id}`);
      if (pair) toDeactivate.push(pair.id);
    }
  }

  for (const country of countries) {
    const slug = slugs[country.code];

    if (!slug) {
      unmapped.push(country.code);
      deactivateCountry(country.id);
      continue;
    }

    const result = await fetchProducts(slug);

    if (result.status === "unreachable") {
      unreadable.push(country.code);
      continue;
    }

    if (result.status === "unsupported") {
      // Refus définitif du fournisseur : rien n'y est achetable.
      unmapped.push(country.code);
      deactivateCountry(country.id);
      continue;
    }

    const products = result.products;
    let sellable = 0;

    for (const service of services) {
      const pair = pairByKey.get(`${country.id}:${service.id}`);
      if (!pair) continue;

      const entry = products[toFiveSimProduct(service.slug)];
      if (!entry || entry.Qty <= 0) {
        toDeactivate.push(pair.id);
        continue;
      }

      sellable++;
      toActivate.push(pair.id);

      const price = computeSellingPriceFcfa(entry.Price, { usdToFcfa, markup });
      const bucket = byPrice.get(price);
      if (bucket) bucket.push(pair.id);
      else byPrice.set(price, [pair.id]);

      if (preview.length < 12) {
        preview.push(
          `  ${country.code}/${service.slug.padEnd(10)} stock ${String(entry.Qty).padStart(9)}` +
            ` | coût ${String(entry.Price).padStart(6)} USD | vente ${String(price).padStart(6)} FCFA`
        );
      }
    }

    (sellable > 0 ? countriesOn : countriesOff).push(country.id);
  }

  // --- Phase 2 : écrire en quelques requêtes groupées ---
  if (APPLY) {
    console.log("\nÉcriture en base...");

    for (const ids of chunk(toDeactivate, CHUNK_SIZE)) {
      await withRetry(() =>
        prisma.countryService.updateMany({ where: { id: { in: ids } }, data: { isActive: false } })
      );
    }
    // Les prix sont écrits AVANT l'activation : un couple fraîchement créé à
    // 0 FCFA n'est ainsi jamais actif avec un prix nul, même un instant.
    for (const [price, ids] of Array.from(byPrice.entries())) {
      for (const batch of chunk(ids, CHUNK_SIZE)) {
        await withRetry(() =>
          prisma.countryService.updateMany({ where: { id: { in: batch } }, data: { price } })
        );
      }
    }
    for (const ids of chunk(toActivate, CHUNK_SIZE)) {
      await withRetry(() =>
        prisma.countryService.updateMany({ where: { id: { in: ids } }, data: { isActive: true } })
      );
    }

    // Avec --service, l'état d'un pays ne peut pas être déduit d'un seul
    // service : il reste tel quel.
    if (!SERVICE_FILTER) {
      for (const ids of chunk(countriesOff, CHUNK_SIZE)) {
        await withRetry(() =>
          prisma.country.updateMany({ where: { id: { in: ids } }, data: { isActive: false } })
        );
      }
      for (const ids of chunk(countriesOn, CHUNK_SIZE)) {
        await withRetry(() =>
          prisma.country.updateMany({ where: { id: { in: ids } }, data: { isActive: true } })
        );
      }
    }

    console.log("Écriture terminée.");
  }

  console.log("\n=== APERÇU ===");
  console.log(preview.join("\n") || "  (aucun couple disponible)");

  console.log("\n=== BILAN ===");
  if (missing.length > 0) {
    console.log(
      APPLY
        ? `  couples créés      : ${created}`
        : `  couples à créer    : ${missing.length} (relancez avec --apply)`
    );
  }
  console.log(`  couples activés    : ${toActivate.length}`);
  console.log(`  couples désactivés : ${toDeactivate.length}`);
  console.log(`  couples tarifés    : ${toActivate.length} (${byPrice.size} prix distincts)`);
  if (!SERVICE_FILTER) {
    console.log(`  pays vendables     : ${countriesOn.length}`);
  }
  console.log(`  pays inconnus du fournisseur : ${unmapped.length}${unmapped.length ? " -> " + unmapped.join(", ") : ""}`);
  if (unreadable.length) {
    console.log(`  pays ignorés (catalogue illisible) : ${unreadable.join(", ")}`);
  }

  if (!APPLY) {
    console.log("\nSimulation uniquement — relancez avec --apply pour écrire en base.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
