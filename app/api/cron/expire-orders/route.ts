import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { applyOrderOutcome } from "@/lib/orders/settle";
import { prisma } from "@/lib/prisma";
import { getSmsProvider, ProviderError } from "@/lib/providers";

// Le remboursement d'un numéro non livré est déclenché par le sondage du
// dashboard — donc uniquement tant que le client garde son onglet ouvert.
// Cette tâche planifiée rattrape tous les autres : elle repasse sur les
// commandes restées PENDING au-delà de leur date d'expiration, demande au
// fournisseur leur issue réelle, et rembourse celles qui n'ont rien livré.
//
// Déclenchée par Vercel Cron (voir la section "crons" de vercel.json).

export const dynamic = "force-dynamic";
// Chaque commande implique un appel au fournisseur : on laisse de la marge.
export const maxDuration = 60;

// Commandes vérifiées en parallèle par lot. Chaque appel fournisseur est
// plafonné à 8 s : un lot coûte donc au pire ~8 s, et TIME_BUDGET_MS laisse
// toujours finir le lot en cours avant maxDuration.
const BATCH_SIZE = 10;
const TIME_BUDGET_MS = 45_000;

// Commandes sans date d'expiration (cas théorique) : on les considère mortes
// passé ce délai, très au-delà du TTL de 10-20 min des fournisseurs.
const FALLBACK_MAX_AGE_MS = 60 * 60 * 1000;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Sans secret configuré, la route reste fermée : une tâche planifiée
  // ouverte permettrait à n'importe qui de la marteler.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const headerBuffer = Buffer.from(header, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (headerBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(headerBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date(startedAt);

  try {
    const provider = getSmsProvider();
    let examined = 0;
    let refunded = 0;
    let completed = 0;
    let failed = 0;
    // Commandes en échec pendant CE passage : exclues des lots suivants pour
    // ne pas les retenter en boucle, elles seront reprises au prochain cron.
    const failedIds: string[] = [];

    // La tâche ne tourne qu'une fois par jour (limite du plan Vercel) : un
    // lot fixe de 25 laissait s'accumuler un arriéré de clients débités dès
    // qu'il y avait plus de 25 abandons par jour. On traite donc des lots
    // parallèles jusqu'à épuisement du stock ou du budget de temps.
    while (Date.now() - startedAt < TIME_BUDGET_MS) {
      const stale = await prisma.order.findMany({
        where: {
          status: "PENDING",
          id: { notIn: failedIds },
          OR: [
            { expiresAt: { lt: now } },
            { expiresAt: null, createdAt: { lt: new Date(now.getTime() - FALLBACK_MAX_AGE_MS) } },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
      });

      if (stale.length === 0) break;
      examined += stale.length;

      await Promise.all(
        stale.map(async (order) => {
          try {
            // Le SMS a pu arriver juste avant l'expiration sans que personne ne
            // sonde : on demande l'issue réelle au fournisseur avant de conclure,
            // pour ne jamais rembourser un numéro qui a effectivement livré.
            let receivedCode: string | null = null;
            let receivedText: string | null = null;

            if (order.providerId) {
              try {
                const sms = await provider.getSms(order.providerId);
                if (sms.status === "RECEIVED" && sms.code) {
                  receivedCode = sms.code;
                  receivedText = sms.fullText;
                }
              } catch (error) {
                // Commande inconnue du fournisseur (purgée de son côté) : la date
                // d'expiration est passée et aucun code n'a jamais été enregistré
                // chez nous, on tranche en faveur du client. Toute AUTRE erreur
                // (fournisseur injoignable) ne dit rien de l'issue réelle : on ne
                // rembourse pas un SMS peut-être livré, la commande sera reprise
                // au passage suivant.
                if (!(error instanceof ProviderError) || error.code !== "ORDER_NOT_FOUND") throw error;
              }
            }

            if (receivedCode) {
              await applyOrderOutcome(order, "COMPLETED", receivedCode, receivedText);
              completed++;
            } else {
              await applyOrderOutcome(order, "EXPIRED", null, null);
              refunded++;
            }
          } catch (error) {
            // Une commande en échec ne doit pas interrompre le lot : elle sera
            // reprise au déclenchement suivant.
            failed++;
            failedIds.push(order.id);
            console.error(`[CRON expire-orders] échec sur la commande ${order.id}`, error);
          }
        })
      );
    }

    console.log(
      `[CRON expire-orders] ${examined} commande(s) examinée(s) : ` +
        `${refunded} remboursée(s), ${completed} complétée(s), ${failed} en échec`
    );

    return NextResponse.json({ examined, refunded, completed, failed });
  } catch (error) {
    console.error("[CRON expire-orders]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
