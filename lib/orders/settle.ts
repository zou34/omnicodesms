import type { Order, OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Applique l'issue d'une commande et rembourse le client si le numéro n'a
 * rien livré.
 *
 * Source unique de la logique d'argent : elle est appelée à la fois par le
 * sondage du dashboard (app/api/orders/[id]/route.ts) et par la tâche
 * planifiée (app/api/cron/expire-orders/route.ts). Les deux peuvent traiter
 * la même commande au même instant — d'où la transition gardée.
 */
export async function applyOrderOutcome(
  order: Order,
  nextStatus: OrderStatus,
  smsCode: string | null,
  fullSms: string | null
): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    // Transition gardée par `status: "PENDING"` : le dashboard sonde toutes
    // les 3 secondes, plusieurs onglets peuvent sonder en parallèle, et le
    // cron peut tomber au même moment. Seule la requête qui fait réellement
    // sortir la commande de PENDING obtient count === 1 et peut rembourser.
    const moved = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: nextStatus, smsCode, fullSms },
    });

    // Expirée ou annulée = aucun SMS reçu. Le client a payé pour un service
    // qui n'a pas été rendu : son solde lui est rendu automatiquement, sans
    // quoi le débit ressemble à un vol.
    if (moved.count === 1 && (nextStatus === "EXPIRED" || nextStatus === "CANCELLED")) {
      await tx.user.update({
        where: { id: order.userId },
        data: { balance: { increment: order.price } },
      });

      await tx.transaction.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: "REFUND",
          status: "SUCCESS",
          provider: "WALLET",
          // La contrainte d'unicité (provider, providerRef) interdit un second
          // remboursement au niveau de la base, même si deux requêtes
          // franchissaient la garde ci-dessus.
          providerRef: `refund_${order.id}`,
          amount: order.price,
          currency: "FCFA",
        },
      });
    }

    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
}
