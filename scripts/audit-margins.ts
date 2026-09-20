/**
 * Audit du garde-fou marge et de la rentabilité du catalogue.
 * Lecture seule : aucun numéro acheté, aucun solde dépensé, rien écrit en base.
 *
 * 1. Contrôles logiques sur assertPositiveMargin (marge positive, marge
 *    négative, marge nulle, coût indisponible).
 * 2. Audit du catalogue : pour chaque couple pays/service actif, confronte le
 *    prix de vente stocké au coût 5sim RÉEL du jour et liste ceux que le
 *    garde-fou refuserait — c'est-à-dire ceux dont le tarif fournisseur a
 *    dérivé au-dessus de notre prix depuis la dernière `npm run sync-catalog`.
 *
 * À lancer avant toute ouverture commerciale, puis périodiquement : un
 * couple qui y apparaît n'est plus vendable (le garde-fou le refusera) et
 * demande une resynchronisation du catalogue.
 *
 *   npm run audit-margins
 */
import "dotenv/config";

import { getProviderUsdToFcfa } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { assertPositiveMargin } from "@/lib/providers/margin-guard";
import { getFiveSimCountrySlugs, toFiveSimProduct } from "@/lib/providers/FiveSimProvider";
import { ProviderError } from "@/lib/providers/types";

const RATE = getProviderUsdToFcfa();
let failures = 0;

function expect(label: string, actual: boolean, expected: boolean) {
  if (actual === expected) console.log(`  OK   ${label}`);
  else {
    console.log(`  FAIL ${label} (attendu ${expected}, obtenu ${actual})`);
    failures++;
  }
}

function blocks(costUsd: number | null, sellingPriceFcfa: number | undefined): boolean {
  try {
    assertPositiveMargin({ provider: "test", country: "FR", service: "google", costUsd, sellingPriceFcfa });
    return false;
  } catch (error) {
    return error instanceof ProviderError && error.code === "NO_NUMBERS_AVAILABLE";
  }
}

async function logicChecks() {
  console.log(`\n=== 1. Logique du garde-fou (taux ${RATE} FCFA / USD) ===`);

  // google/FR : 0,19 $ chez les deux fournisseurs = 114 FCFA. Prix catalogue
  // calculé par sync-catalog : ceil(0.19*600*2.5/10)*10 = 290 FCFA.
  expect("coût 0,19 $ (114 FCFA) vs vente 290 FCFA -> laisse passer", blocks(0.19, 290), false);

  // Le scénario que le garde-fou existe pour attraper : le fournisseur a
  // augmenté depuis la dernière synchro du catalogue.
  expect("coût 0,60 $ (360 FCFA) vs vente 290 FCFA -> BLOQUE", blocks(0.6, 290), true);
  expect("coût égal au prix de vente -> BLOQUE (marge nulle)", blocks(290 / RATE, 290), true);

  // Avant correctif : 0,60 x 6 = 3,6 FCFA < 290 -> l'achat passait.
  const ancienCalcul = 0.6 * 6;
  expect(
    `ancien taux RUB (x6) aurait laissé passer 0,60 $ (${ancienCalcul} FCFA "calculés")`,
    ancienCalcul >= 290,
    false
  );

  // Fail-closed quand le chiffrage fournisseur est indisponible.
  expect("coût inconnu (API tarifs en panne) -> BLOQUE", blocks(null, 290), true);
  expect("coût NaN -> BLOQUE", blocks(Number.NaN, 290), true);

  // Hors tunnel d'achat (scripts de diagnostic) : pas d'arbitrage.
  expect("pas de prix de vente injecté -> laisse passer", blocks(999, undefined), false);
}

async function catalogAudit() {
  console.log(`\n=== 2. Audit marge du catalogue contre les prix 5sim du jour ===`);

  const pairs = await prisma.countryService.findMany({
    where: { isActive: true, country: { isActive: true } },
    include: { country: true, service: true },
  });
  console.log(`  ${pairs.length} couples pays/service actifs en base.`);

  const slugs = await getFiveSimCountrySlugs();
  const byCountry = new Map<string, typeof pairs>();
  for (const pair of pairs) {
    const list = byCountry.get(pair.country.code) ?? [];
    list.push(pair);
    byCountry.set(pair.country.code, list);
  }

  const losses: string[] = [];
  let checked = 0;
  let unreachable = 0;

  // Array.from : même contrainte de cible TS que dans scripts/sync-catalog.ts,
  // un Map ne s'itère pas directement.
  for (const [code, list] of Array.from(byCountry.entries())) {
    const slug = slugs[code];
    if (!slug) continue;

    let products: Record<string, { Price: number; Qty: number }>;
    try {
      const response = await fetch(`${process.env.FIVESIM_BASE ?? "https://5sim.net/v1"}/guest/products/${slug}/any`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) { unreachable++; continue; }
      products = await response.json();
    } catch {
      unreachable++;
      continue;
    }

    for (const pair of list) {
      const entry = products[toFiveSimProduct(pair.service.slug)];
      if (!entry) continue;
      checked++;

      const sellingPriceFcfa = Number(pair.price);
      const costFcfa = entry.Price * RATE;
      if (costFcfa >= sellingPriceFcfa) {
        losses.push(
          `    ${code}/${pair.service.slug}: coût ${entry.Price} $ = ${costFcfa.toFixed(0)} FCFA ` +
            `>= vente ${sellingPriceFcfa} FCFA (marge ${(sellingPriceFcfa - costFcfa).toFixed(0)})`
        );
      }
    }
  }

  console.log(`  ${checked} couples confrontés au tarif 5sim en direct (${unreachable} pays injoignables).`);
  if (losses.length === 0) {
    console.log(`  Aucun couple à marge nulle ou négative — le garde-fou ne bloquerait rien aujourd'hui.`);
  } else {
    console.log(`  ${losses.length} couple(s) que le garde-fou REFUSERAIT (vente à perte) :`);
    console.log(losses.slice(0, 30).join("\n"));
    if (losses.length > 30) console.log(`    ... et ${losses.length - 30} autres.`);
  }
}

async function main() {
  await logicChecks();
  try {
    await catalogAudit();
  } catch (error) {
    console.log(`\n  (audit catalogue impossible : ${(error as Error).message})`);
  }
  console.log(`\n=== BILAN : ${failures === 0 ? "tous les contrôles logiques passent" : `${failures} ÉCHEC(S)`} ===`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
