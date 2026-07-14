import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getPackById } from "@/lib/packs";
import { prisma } from "@/lib/prisma";

const rechargeSchema = z.object({
  packId: z.string().min(1),
});

// Simulates a payment gateway confirmation so the recharge flow can be
// built and tested end-to-end before Stripe/Flutterwave are wired in.
//
// To go live with a real provider:
//   1. This route becomes "initiate payment": create a Stripe Checkout
//      Session (or a Flutterwave payment link) for `pack.priceFcfa` and
//      return its redirect URL instead of crediting anything here.
//   2. Add `app/api/webhooks/stripe/route.ts` (and/or flutterwave): verify
//      the provider's signature, then run the exact same
//      "debit-guarded balance increment + DEPOSIT transaction" block below
//      — with `provider: "STRIPE"` / `"FLUTTERWAVE"` and the real
//      `providerRef` (session/transaction id) instead of `"MOCK"`.
// The pack catalog (lib/packs.ts), the ledger shape, and the client call
// in RechargeModal don't need to change either way.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }

    const parsed = rechargeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      );
    }

    const pack = getPackById(parsed.data.packId);
    if (!pack) {
      return NextResponse.json({ error: "Pack introuvable." }, { status: 404 });
    }

    // Simulated gateway round-trip.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: { balance: { increment: pack.priceFcfa } },
      });

      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: "DEPOSIT",
          status: "SUCCESS",
          provider: "MOCK",
          providerRef: `recharge_${pack.id}_${Date.now()}`,
          amount: pack.priceFcfa,
          currency: "FCFA",
        },
      });

      return user;
    });

    return NextResponse.json({ balance: updatedUser.balance.toString(), pack }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/wallet/recharge]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
