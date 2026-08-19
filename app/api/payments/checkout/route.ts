import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getPackById } from "@/lib/packs";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const checkoutSchema = z.object({
  packId: z.string().min(1),
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Keyed per user: each call creates a PENDING transaction row and (once a
// real gateway is wired) an outbound API call, so the goal is stopping one
// account from spamming session creation, not general traffic shaping.
const CHECKOUT_LIMIT = 10;
const CHECKOUT_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const limit = rateLimit(`checkout:${session.user.id}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      );
    }

    // Never trust a client-submitted price — the pack (and therefore the
    // amount charged) is always resolved server-side from lib/packs.ts.
    const pack = getPackById(parsed.data.packId);
    if (!pack) {
      return NextResponse.json({ error: "Pack introuvable." }, { status: 404 });
    }

    const reference = `checkout_${randomUUID()}`;

    // Recorded PENDING up front so /api/webhooks/payment has something to
    // confirm against, and so a replayed/duplicate webhook delivery can be
    // detected (see the idempotency check there) instead of double-crediting.
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "DEPOSIT",
        status: "PENDING",
        provider: "GATEWAY",
        providerRef: reference,
        amount: pack.priceFcfa,
        currency: "FCFA",
      },
    });

    // No live gateway key configured yet — hand back a fake checkout URL so
    // the redirect flow can be built and tested end-to-end locally. Delete
    // this branch once PAYMENT_API_KEY is set; the real call below already
    // does the right thing.
    if (!process.env.PAYMENT_API_KEY) {
      const fakeCheckoutUrl = `${APP_URL}/dashboard?mock_checkout=${reference}`;
      return NextResponse.json({ checkoutUrl: fakeCheckoutUrl, reference }, { status: 200 });
    }

    // --- Real gateway call -------------------------------------------------
    // Shaped after a typical Moneroo/PayTech "create checkout session" call.
    // Field names WILL need adjusting to match whichever gateway is chosen —
    // this is a faithful skeleton of the request, not a verified contract.
    const gatewayResponse = await fetch("https://api.moneroo.io/v1/payments/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
      },
      body: JSON.stringify({
        amount: pack.priceFcfa,
        currency: "XOF",
        description: `Recharge OmniCodeSMS — pack ${pack.activations} activations`,
        reference,
        customer: {
          email: session.user.email,
        },
        metadata: {
          userId: session.user.id,
          packId: pack.id,
          transactionId: transaction.id,
        },
        return_url: `${APP_URL}/dashboard?payment=success`,
        cancel_url: `${APP_URL}/dashboard?payment=cancelled`,
        webhook_url: `${APP_URL}/api/webhooks/payment`,
      }),
    });

    if (!gatewayResponse.ok) {
      // Nothing to confirm later if the gateway never created a session.
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: "Le fournisseur de paiement est indisponible." },
        { status: 502 }
      );
    }

    const gatewayData = await gatewayResponse.json();

    return NextResponse.json({ checkoutUrl: gatewayData.checkout_url, reference }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/payments/checkout]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
