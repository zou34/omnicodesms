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
// arriving on the provider's side (simulated by MockProvider) into our DB.
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

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          smsCode: smsResult.code,
          fullSms: smsResult.fullText,
        },
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
