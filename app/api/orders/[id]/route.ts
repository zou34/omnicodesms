import type { OrderStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { applyOrderOutcome } from "@/lib/orders/settle";
import { prisma } from "@/lib/prisma";
import { getSmsProvider, ProviderError } from "@/lib/providers";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type { SmsStatus } from "@/lib/providers/types";

// Chaque appel interroge GrizzlySMS : sans limite, un script pourrait
// marteler cette route et faire bannir notre clé API chez le fournisseur.
// Le dashboard sonde toutes les 3 s par commande en attente (20/min) : 120/min
// laisse de la marge pour plusieurs commandes et onglets simultanés.
const POLL_LIMIT = 120;
const POLL_WINDOW_MS = 60 * 1000;

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

    const limit = rateLimit(`order-poll:${session.user.id}`, POLL_LIMIT, POLL_WINDOW_MS);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfterSeconds);
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

      // Transition et remboursement éventuel : logique partagée avec la tâche
      // planifiée qui rattrape les commandes dont personne ne regarde l'onglet.
      const updated = await applyOrderOutcome(order, nextStatus, smsResult.code, smsResult.fullText);

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
