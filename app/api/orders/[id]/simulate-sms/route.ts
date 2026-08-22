import type { OrderStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmsProvider } from "@/lib/providers";
import { MockProvider } from "@/lib/providers/MockProvider";
import type { SmsStatus } from "@/lib/providers/types";

const SMS_STATUS_TO_ORDER_STATUS: Record<SmsStatus, OrderStatus> = {
  PENDING: "PENDING",
  RECEIVED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
};

// Demo/testing aid: delivers a PENDING order's SMS immediately instead of
// waiting for MockProvider's randomized 3-8s timer — e.g. for recording a
// marketing walkthrough without dead air. Only works while MockProvider is
// the active provider — checked via `.name` (per the same pattern as
// app/api/mock-payment-gateway/route.ts) rather than `instanceof`, which
// isn't reliable across separately-bundled route modules in dev; a real
// gateway has no such button, and the frontend only renders it when the
// server confirms mock is active (see app/dashboard/page.tsx's
// `isMockSmsProvider`).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const provider = getSmsProvider();
    if (provider.name !== "mock") {
      return NextResponse.json({ error: "Non disponible." }, { status: 404 });
    }

    if (order.status !== "PENDING" || !order.providerId) {
      return NextResponse.json(order);
    }

    const smsResult = await (provider as MockProvider).simulateReceipt(order.providerId);
    const nextStatus = SMS_STATUS_TO_ORDER_STATUS[smsResult.status];

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: nextStatus, smsCode: smsResult.code, fullSms: smsResult.fullText },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[POST /api/orders/:id/simulate-sms]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
