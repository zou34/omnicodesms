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

// Plus large que le sondage n'en a besoin : un client n'annule qu'à la main.
const CANCEL_LIMIT = 20;
const CANCEL_WINDOW_MS = 60 * 1000;

// Annulation demandée par le client, avec remboursement immédiat. Sans elle,
// un numéro qui ne reçoit rien bloquait le solde jusqu'à son expiration
// (10-20 min), et le client ne pouvait pas retenter avec un autre numéro.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const limit = rateLimit(`order-cancel:${session.user.id}`, CANCEL_LIMIT, CANCEL_WINDOW_MS);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });

    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    // Déjà réglée (SMS reçu, expirée, annulée ailleurs) : on renvoie l'état
    // réel, le dashboard se resynchronise dessus.
    if (order.status !== "PENDING" || !order.providerId) {
      return NextResponse.json(order);
    }

    const provider = getSmsProvider();

    try {
      // Un SMS arrivé entre deux sondages ne doit jamais être perdu par une
      // annulation : on relit l'état chez le fournisseur avant d'annuler.
      const before = await provider.getSms(order.providerId);
      if (before.status !== "PENDING") {
        const updated = await applyOrderOutcome(
          order,
          SMS_STATUS_TO_ORDER_STATUS[before.status],
          before.code,
          before.fullText
        );
        return NextResponse.json(updated);
      }

      const result = await provider.cancelOrder(order.providerId);

      if (result.success) {
        // Remboursement par la logique partagée (transition gardée, écriture
        // REFUND unique) : un sondage ou le cron concurrent ne peut pas
        // rembourser une seconde fois.
        const updated = await applyOrderOutcome(order, "CANCELLED", null, null);
        return NextResponse.json(updated);
      }

      if (result.status === "PENDING") {
        // GrizzlySMS refuse toute annulation dans les 2 premières minutes
        // (EARLY_CANCEL_DENIED) : rien n'a changé, le client réessaiera.
        return NextResponse.json(
          {
            error: "Ce numéro ne peut pas encore être annulé. Réessayez dans un instant.",
            code: "CANCEL_TOO_EARLY",
          },
          { status: 409 }
        );
      }

      // Refus pour une autre raison (SMS arrivé entre-temps, expiration) :
      // on applique l'issue réelle.
      const after = await provider.getSms(order.providerId);
      const updated = await applyOrderOutcome(
        order,
        SMS_STATUS_TO_ORDER_STATUS[after.status],
        after.code,
        after.fullText
      );
      return NextResponse.json(updated);
    } catch (error) {
      if (error instanceof ProviderError) {
        // Message neutre, comme partout : le libellé brut nomme le fournisseur.
        console.error(`[DELETE /api/orders/:id] ${error.code} pour ${order.id}: ${error.message}`);
        return NextResponse.json(
          { error: "Annulation momentanément impossible. Réessayez dans quelques instants.", code: error.code },
          { status: 502 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[DELETE /api/orders/:id]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
