import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Generous on purpose: real gateways retry aggressively on anything but a
// clean 200, so this only needs to catch an outright flood/DoS attempt, not
// normal retry traffic. Checked first, before signature/DB work, so a
// flood is cheap to reject.
const WEBHOOK_LIMIT = 100;
const WEBHOOK_WINDOW_MS = 60 * 1000;

// Confirms (or rejects) a payment initiated via /api/payments/checkout.
// This is the single most security-sensitive route in the app: it's the
// only thing standing between an unauthenticated internet endpoint and
// crediting real money to a user's balance.
//
// Always answers 200 once the payload is at least readable — gateways
// retry aggressively (often for hours/days) on anything else, and a
// stream of retries for a payload we already understood (but, say, don't
// recognize the reference for) just adds noise without fixing anything.
export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`webhook:${ip}`, WEBHOOK_LIMIT, WEBHOOK_WINDOW_MS);
  if (!limit.success) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  // Read the raw body BEFORE parsing: signature schemes are computed over
  // the exact bytes the gateway sent, and JSON.stringify(JSON.parse(body))
  // is not guaranteed to reproduce that byte-for-byte.
  const rawBody = await request.text();

  // Provider-agnostic from here: whichever gateway's signature scheme and
  // payload shape apply is entirely MockPaymentProvider's (or a future
  // real provider's) concern — this route only cares about the verified
  // event it hands back.
  const verification = await getPaymentProvider().verifyWebhook(rawBody, request.headers);

  if (!verification.valid) {
    if (verification.reason === "INVALID_SIGNATURE") {
      console.warn("[POST /api/webhooks/payment] rejected: invalid or missing signature");
      return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
    }
    if (verification.reason === "MALFORMED_BODY") {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }
    // Signed by someone who holds our secret, but not a shape we
    // recognize — log for investigation, still 200 so it isn't retried.
    console.error("[POST /api/webhooks/payment] unexpected payload shape", rawBody);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const { reference, status, amountFcfa } = verification.event;

  try {
    const transaction = await prisma.transaction.findFirst({
      where: { providerRef: reference, provider: "GATEWAY" },
    });

    if (!transaction) {
      console.error(`[POST /api/webhooks/payment] unknown reference: ${reference}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Fast-path skip (avoids the DB round-trip below for the common case
    // of a plain retried delivery) — the real, race-safe guard is the
    // `updateMany` below, not this check.
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Defense in depth: if the gateway tells us the amount it collected,
    // it must match what we asked for. A mismatch here is a red flag, not
    // something to silently accept.
    if (amountFcfa !== undefined && Number(transaction.amount) !== amountFcfa) {
      console.error(
        `[POST /api/webhooks/payment] amount mismatch for ${reference}: expected ${transaction.amount}, got ${amountFcfa}`
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Idempotency, done properly: gateways may (and do) deliver the same
    // event more than once, including concurrently. `updateMany` with a
    // `status: "PENDING"` guard makes the PENDING -> SUCCESS/FAILED
    // transition atomic at the database level — only the request that
    // actually flips the row gets `count === 1` and is allowed to touch
    // the balance. Without this guard, two concurrent deliveries could
    // both read "still PENDING" and both credit the balance (double
    // credit) — the exact race the balance-debit path already avoids via
    // the equivalent `updateMany`/`gte` pattern in app/api/orders/route.ts.
    const settled = await prisma.$transaction(async (tx) => {
      const result = await tx.transaction.updateMany({
        where: { id: transaction.id, status: "PENDING" },
        data: { status: status === "SUCCESS" ? "SUCCESS" : "FAILED" },
      });

      if (result.count === 0) {
        // Lost the race to another delivery of the same event — nothing
        // left to do.
        return false;
      }

      if (status === "SUCCESS") {
        await tx.user.update({
          where: { id: transaction.userId },
          data: { balance: { increment: transaction.amount } },
        });
      }

      return true;
    });

    if (!settled) {
      console.warn(`[POST /api/webhooks/payment] duplicate delivery ignored for ${reference}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/webhooks/payment]", error);
    // Still 200: an internal error here won't be fixed by the gateway
    // resending the exact same payload — alerting should happen off the
    // back of the log line above, not a retry storm.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
