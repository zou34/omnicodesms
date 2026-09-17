import type { OrderStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmsProvider, ProviderError } from "@/lib/providers";
import type { SmsStatus } from "@/lib/providers/types";

const SMS_STATUS_TO_ORDER_STATUS: Record<SmsStatus, OrderStatus> = {
  PENDING: "PENDING",
  RECEIVED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
};

// Polled by the dashboard while an order is PENDING, to reflect the SMS
// arriving on the provider's side into our DB.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });

    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    if (order.status !== "PENDING" || !order.providerId) {
      return NextResponse.json(order);
    }

    const provider = getSmsProvider();

    try {
      const smsResult = await provider.getSms(order.providerId);
      const nextStatus = SMS_STATUS_TO_ORDER_STATUS[smsResult.status];

      if (nextStatus === order.status && smsResult.code === order.smsCode) {
        return NextResponse.json(order);
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Transition gardée par `status: "PENDING"` : le dashboard sonde cette
        // route toutes les 3 secondes, et plusieurs onglets peuvent la sonder
        // en parallèle. Seule la requête qui fait réellement sortir la commande
        // de PENDING obtient count === 1 et peut rembourser.
        const moved = await tx.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: {
            status: nextStatus,
            smsCode: smsResult.code,
            fullSms: smsResult.fullText,
          },
        });

        // Numéro expiré ou annulé = aucun SMS reçu. Le client a payé pour un
        // service qui n'a pas été rendu : son solde lui est rendu
        // automatiquement, sans quoi le débit ressemble à un vol.
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
              // La contrainte d'unicité (provider, providerRef) rend un second
              // remboursement impossible au niveau de la base, même si deux
              // requêtes franchissaient la garde ci-dessus.
              providerRef: `refund_${order.id}`,
              amount: order.price,
              currency: "FCFA",
            },
          });
        }

        return tx.order.findUniqueOrThrow({ where: { id: order.id } });
      });

      return NextResponse.json(updated);
    } catch (error) {
      if (error instanceof ProviderError && error.code === "ORDER_NOT_FOUND") {
        // The provider's in-memory state was reset (e.g. dev server
        // restart) — fall back to the last known DB state instead of
        // failing the poll.
        return NextResponse.json(order);
      }
      throw error;
    }
  } catch (error) {
    console.error("[GET /api/orders/:id]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
