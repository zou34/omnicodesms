import type { Prisma } from "@prisma/client";

import type { VerifiedPaymentEvent } from "@/lib/payments/types";
import { prisma } from "@/lib/prisma";

/**
 * Règle une recharge (Transaction DEPOSIT, provider GATEWAY) à partir d'un
 * événement de paiement vérifié : la crédite (montant + bonus du palier +
 * bonus promo) ou la passe en échec.
 *
 * Seul chemin qui crédite un solde après un paiement. Partagé par :
 *  - le webhook (app/api/webhooks/payment/route.ts), en temps réel ;
 *  - le rapprochement quotidien (app/api/cron/expire-orders/route.ts), filet
 *    de sécurité qui repasse sur les paiements que la passerelle déclare
 *    payés — au cas où un webhook se serait perdu.
 *
 * Idempotent et sans risque de double crédit : la transition de statut est
 * atomique (`updateMany` avec garde de statut), et SUCCESS est terminal.
 * Les erreurs de base de données sont levées, jamais avalées : l'appelant
 * doit pouvoir réessayer.
 */
export type SettleOutcome = "credited" | "failed" | "already-settled" | "unknown-reference" | "amount-mismatch";

/** Crédite un bonus et l'inscrit au grand livre (type BONUS, référence unique). */
async function creditBonus(
  tx: Prisma.TransactionClient,
  userId: string,
  depositId: string,
  kind: "bonus" | "promo",
  amount: Prisma.Decimal
) {
  await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
  await tx.transaction.create({
    data: {
      userId,
      type: "BONUS",
      status: "SUCCESS",
      provider: "WALLET",
      // Contrainte d'unicité (provider, providerRef) : un même bonus ne peut
      // jamais être inscrit deux fois pour un même dépôt.
      providerRef: `${kind}_${depositId}`,
      amount,
      currency: "FCFA",
    },
  });
}

export async function settleDeposit(event: VerifiedPaymentEvent, logPrefix: string): Promise<SettleOutcome> {
  const { reference, status, amountFcfa } = event;

  const transaction = await prisma.transaction.findFirst({
    where: { providerRef: reference, provider: "GATEWAY" },
  });

  if (!transaction) {
    console.error(`${logPrefix} unknown reference: ${reference}`);
    return "unknown-reference";
  }

  // Un échec n'est pas définitif : sur la page SasPay, le client peut
  // « Réessayer » sur la même session après un premier échec (Wave non
  // validé, solde insuffisant...). SasPay notifie alors l'échec PUIS la
  // réussite, pour la même référence. FAILED -> SUCCESS doit donc rester
  // possible — sans quoi le client paie et n'est jamais crédité (cas réel
  // du 11/10/2026). Seul SUCCESS est terminal.
  const settleableFrom: Array<"PENDING" | "FAILED"> = status === "SUCCESS" ? ["PENDING", "FAILED"] : ["PENDING"];

  // Fast-path skip (avoids the DB round-trip below for the common case of a
  // plain retried delivery) — the real, race-safe guard is the `updateMany`
  // below, not this check.
  if (!(settleableFrom as string[]).includes(transaction.status)) {
    return "already-settled";
  }

  // Defense in depth: if the gateway tells us the amount it collected, it
  // must match what we asked for. A mismatch here is a red flag, not
  // something to silently accept.
  if (amountFcfa !== undefined && Number(transaction.amount) !== amountFcfa) {
    console.error(
      `${logPrefix} amount mismatch for ${reference}: expected ${transaction.amount}, got ${amountFcfa}`
    );
    return "amount-mismatch";
  }

  // Idempotency, done properly: gateways may (and do) deliver the same
  // event more than once, including concurrently. `updateMany` with a status
  // guard makes the transition atomic at the database level — only the
  // request that actually flips the row gets `count === 1` and is allowed to
  // touch the balance. A SUCCESS row is never in `settleableFrom`, so a
  // duplicate or concurrent success delivery always gets `count === 0` and
  // can't credit twice — the exact race the balance-debit path already
  // avoids via the equivalent `updateMany`/`gte` pattern in
  // app/api/orders/route.ts.
  const settled = await prisma.$transaction(async (tx) => {
    const result = await tx.transaction.updateMany({
      where: { id: transaction.id, status: { in: settleableFrom } },
      data: { status: status === "SUCCESS" ? "SUCCESS" : "FAILED" },
    });

    if (result.count === 0) {
      // Lost the race to another delivery of the same event — nothing left
      // to do.
      return false;
    }

    if (status === "SUCCESS") {
      await tx.user.update({
        where: { id: transaction.userId },
        data: { balance: { increment: transaction.amount } },
      });

      // Bonus du palier (ex. Pass Pro : 5 000 payés, +1 000 offerts), figé
      // au checkout. Écriture BONUS séparée : l'historique du client continue
      // de sommer exactement à son solde.
      if (transaction.bonusAmount.gt(0)) {
        await creditBonus(tx, transaction.userId, transaction.id, "bonus", transaction.bonusAmount);
      }

      // Bonus du code promo, sous deux conditions revérifiées ICI de façon
      // atomique, car deux paiements peuvent être en cours avec le même code :
      // quota non épuisé (UPDATE conditionnel) et première utilisation par ce
      // client. Le paiement, lui, est crédité quoi qu'il arrive — seul le
      // bonus saute.
      if (transaction.promoCodeId && transaction.promoBonusAmount.gt(0)) {
        const alreadyRedeemed = await tx.promoRedemption.findUnique({
          where: { promoCodeId_userId: { promoCodeId: transaction.promoCodeId, userId: transaction.userId } },
          select: { id: true },
        });
        const quotaTaken = alreadyRedeemed
          ? 0
          : await tx.$executeRaw`
              UPDATE "PromoCode" SET "usedCount" = "usedCount" + 1
              WHERE "id" = ${transaction.promoCodeId}
                AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;

        if (quotaTaken === 1) {
          // Une course sur l'unicité (même client, deux paiements simultanés)
          // lèverait une erreur ici : la transaction entière est annulée,
          // l'appelant réessaie (webhook : 500 puis relance SasPay), et la
          // relance trouve la redemption existante — le paiement est alors
          // crédité sans bonus.
          await tx.promoRedemption.create({
            data: {
              promoCodeId: transaction.promoCodeId,
              userId: transaction.userId,
              transactionId: transaction.id,
            },
          });
          await creditBonus(tx, transaction.userId, transaction.id, "promo", transaction.promoBonusAmount);
        } else {
          console.warn(`${logPrefix} bonus promo non versé pour ${reference} : code déjà utilisé ou quota épuisé`);
        }
      }
    }

    return true;
  });

  if (!settled) {
    console.warn(`${logPrefix} duplicate delivery ignored for ${reference}`);
    return "already-settled";
  }

  return status === "SUCCESS" ? "credited" : "failed";
}
