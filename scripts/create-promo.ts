/**
 * Crée (ou met à jour) un code promo.
 *
 *   npm run create-promo -- BIENVENUE percent 20 --max-bonus=2000 --min=2500 --uses=500 --expires=2026-12-31
 *   npm run create-promo -- LANCEMENT fixed 500 --uses=100
 *   npm run create-promo -- LANCEMENT --disable
 *
 * percent : +N % du montant rechargé offert en crédit (plafonné par --max-bonus)
 * fixed   : +N FCFA offerts
 * --min      recharge minimale en FCFA pour que le code s'applique
 * --uses     nombre total d'utilisations (tous clients confondus)
 * --expires  date d'expiration (fin de journée, heure d'Abidjan / GMT)
 * Chaque client ne peut utiliser un code qu'une seule fois.
 */
import "dotenv/config";

import { prisma } from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promo-rules";

function flag(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
}

async function main() {
  const [rawCode, rawType, rawValue] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const code = normalizePromoCode(rawCode ?? "");
  if (!code) throw new Error("Usage : npm run create-promo -- CODE percent|fixed VALEUR [--options]");

  if (process.argv.includes("--disable")) {
    await prisma.promoCode.update({ where: { code }, data: { isActive: false } });
    console.log(`Code ${code} désactivé.`);
    return;
  }

  const type = rawType?.toLowerCase() === "percent" ? "PERCENT" : rawType?.toLowerCase() === "fixed" ? "FIXED" : null;
  const value = Number(rawValue);
  if (!type || !Number.isInteger(value) || value <= 0) throw new Error("Type (percent|fixed) et valeur entière > 0 requis.");
  if (type === "PERCENT" && value > 100) throw new Error("Un pourcentage ne peut pas dépasser 100.");

  const expires = flag("expires");
  const data = {
    type,
    value,
    maxBonusFcfa: flag("max-bonus") ? Number(flag("max-bonus")) : null,
    minRechargeFcfa: flag("min") ? Number(flag("min")) : 0,
    maxUses: flag("uses") ? Number(flag("uses")) : null,
    expiresAt: expires ? new Date(`${expires}T23:59:59Z`) : null,
    isActive: true,
  } as const;

  const promo = await prisma.promoCode.upsert({ where: { code }, create: { code, ...data }, update: data });
  console.log("Code promo enregistré :", promo);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
