/**
 * Synchronise le catalogue (pays, services, prix) avec l'inventaire réel du
 * fournisseur SMS, et garantit une marge sur chaque couple pays/service.
 *
 * Le catalogue initial venait de prisma/seed.ts : 108 pays x 8 services
 * tarifés arbitrairement, sans lien avec ce que le fournisseur vend
 * réellement. Résultat : des combinaisons proposées à l'écran qui échouent
 * à l'achat, et des prix de vente sans rapport avec nos coûts.
 *
 * Ce script interroge l'endpoint public de 5sim (aucune authentification,
 * aucun crédit consommé), puis :
 *   - désactive tout couple pays/service que le fournisseur ne propose pas
 *     ou dont le stock est nul ;
 *   - (ré)active et retarife ceux qui sont réellement disponibles ;
 *   - désactive les pays dont plus aucun service n'est vendable.
 *
 * Usage :
 *   npm run sync-catalog              # simulation, n'écrit rien
 *   npm run sync-catalog -- --apply   # applique les changements
 *
 * Variables requises pour le calcul des prix :
 *   SMS_UNIT_TO_FCFA   Valeur en FCFA d'UNE unité de prix fournisseur.
 *   SMS_PRICE_MARKUP   Multiplicateur de marge (ex. 2.5 = +150 %).
 *
 * Sans ces deux variables, le script tourne quand même mais se limite aux
 * activations/désactivations : il ne touche à aucun prix. C'est volontaire —
 * fixer un prix de vente sur un coût mal converti ferait vendre à perte.
 *
 * Le script est idempotent : on peut le relancer sans risque après un échec
 * réseau, il reconverge vers le même état.
 */
import "dotenv/config";

import { getFiveSimCountrySlugs } from "@/lib/providers/FiveSimProvider";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://5sim.net/v1";
const APPLY = process.argv.includes("--apply");

// Les écritures sont groupées : le pooler Supabase (pgbouncer, mode
// transaction) ferme la connexion si on lui enchaîne ~900 requêtes unitaires
// — c'est ce qui a fait échouer la première version de ce script (P1017).
const CHUNK_SIZE = 200;

const unitToFcfa = Number(process.env.SMS_UNIT_TO_FCFA);
const markup = Number(process.env.SMS_PRICE_MARKUP);
const canPrice =
  Number.isFinite(unitToFcfa) && unitToFcfa > 0 && Number.isFinite(markup) && markup > 0;

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

async function main() {
  console.log(APPLY ? "=== SYNCHRONISATION (écriture) ===" : "=== SIMULATION (aucune écriture) ===");
  console.log(
    canPrice
      ? `Tarification : 1 unité fournisseur = ${unitToFcfa} FCFA, marge x${markup}`
      : "Tarification : DÉSACTIVÉE (SMS_UNIT_TO_FCFA / SMS_PRICE_MARKUP absentes ou invalides)\n" +
          "               -> seules les disponibilités sont synchronisées, les prix restent inchangés."
  );

  const slugs = await getFiveSimCountrySlugs();
  const [countries, services, pairs] = await Promise.all([
    prisma.country.findMany({ orderBy: { code: "asc" } }),
    prisma.service.findMany({ orderBy: { slug: "asc" } }),
    prisma.countryService.findMany({ select: { id: true, countryId: true, serviceId: true } }),
  ]);

  const pairId = new Map(pairs.map((p) => [`${p.countryId}:${p.serviceId}`, p.id]));

  // --- Phase 1 : tout décider en mémoire (réseau fournisseur uniquement) ---
  const toActivate: string[] = [];
  const toDeactivate: string[] = [];
  const byPrice = new Map<number, string[]>();
  const countriesOn: string[] = [];
  const countriesOff: string[] = [];
  const unmapped: string[] = [];
  const unreadable: string[] = [];
  const preview: string[] = [];

  for (const country of countries) {
    const slug = slugs[country.code];

    if (!slug) {
      unmapped.push(country.code);
      countriesOff.push(country.id);
      for (const service of services) {
        const id = pairId.get(`${country.id}:${service.id}`);
        if (id) toDeactivate.push(id);
      }
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
      countriesOff.push(country.id);
      for (const service of services) {
        const id = pairId.get(`${country.id}:${service.id}`);
        if (id) toDeactivate.push(id);
      }
      continue;
    }

    const products = result.products;
    let sellable = 0;

    for (const service of services) {
      const id = pairId.get(`${country.id}:${service.id}`);
      if (!id) continue;

      const entry = products[service.slug];
      if (!entry || entry.Qty <= 0) {
        toDeactivate.push(id);
        continue;
      }

      sellable++;
      toActivate.push(id);

      if (canPrice) {
        // Arrondi à la dizaine de FCFA supérieure : jamais en dessous du
        // coût majoré, et un prix affichable proprement.
        const price = Math.ceil((entry.Price * unitToFcfa * markup) / 10) * 10;
        const bucket = byPrice.get(price);
        if (bucket) bucket.push(id);
        else byPrice.set(price, [id]);
      }

      if (preview.length < 12) {
        const price = canPrice
          ? Math.ceil((entry.Price * unitToFcfa * markup) / 10) * 10
          : null;
        preview.push(
          `  ${country.code}/${service.slug.padEnd(10)} stock ${String(entry.Qty).padStart(9)}` +
            ` | coût ${String(entry.Price).padStart(6)}` +
            (price !== null ? ` | vente ${String(price).padStart(6)} FCFA` : " | prix inchangé")
        );
      }
    }

    (sellable > 0 ? countriesOn : countriesOff).push(country.id);
  }

  // --- Phase 2 : écrire en quelques requêtes groupées ---
  if (APPLY) {
    console.log("\nÉcriture en base...");

    for (const ids of chunk(toDeactivate, CHUNK_SIZE)) {
      await prisma.countryService.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    }
    for (const ids of chunk(toActivate, CHUNK_SIZE)) {
      await prisma.countryService.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
    }
    // Un seul UPDATE par prix distinct, et non par couple.
    for (const [price, ids] of Array.from(byPrice.entries())) {
      for (const batch of chunk(ids, CHUNK_SIZE)) {
        await prisma.countryService.updateMany({ where: { id: { in: batch } }, data: { price } });
      }
    }
    for (const ids of chunk(countriesOff, CHUNK_SIZE)) {
      await prisma.country.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    }
    for (const ids of chunk(countriesOn, CHUNK_SIZE)) {
      await prisma.country.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
    }

    console.log("Écriture terminée.");
  }

  console.log("\n=== APERÇU ===");
  console.log(preview.join("\n"));

  console.log("\n=== BILAN ===");
  console.log(`  couples activés    : ${toActivate.length}`);
  console.log(`  couples désactivés : ${toDeactivate.length}`);
  console.log(`  couples retarifés  : ${canPrice ? toActivate.length : 0}${canPrice ? ` (${byPrice.size} prix distincts)` : ""}`);
  console.log(`  pays vendables     : ${countriesOn.length}`);
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
