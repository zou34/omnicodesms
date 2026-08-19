import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Generous on purpose: real gateways retry aggressively on anything but a
// clean 200, so this only needs to catch an outright flood/DoS attempt, not
// normal retry traffic. Checked first, before HMAC/DB work, so a flood is
// cheap to reject.
const WEBHOOK_LIMIT = 100;
const WEBHOOK_WINDOW_MS = 60 * 1000;

// Real gateway payloads vary (Moneroo/PayTech each have their own event
// shape) — adjust field names once a provider is picked. `amount` is
// optional so we can cross-check it when the gateway sends it, without
// hard-failing on providers that don't.
const webhookPayloadSchema = z.object({
  reference: z.string().min(1),
  status: z.enum(["SUCCESS", "FAILED"]),
  amount: z.number().optional(),
});

function isSignatureValid(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  // Buffers must be equal length before timingSafeEqual — and mismatched
  // length already means "not a match", so bail out the same way instead
  // of throwing.
  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

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

  // Read the raw body BEFORE parsing: the HMAC signature is computed over
  // the exact bytes the gateway sent, and JSON.stringify(JSON.parse(body))
  // is not guaranteed to reproduce that byte-for-byte.
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!isSignatureValid(rawBody, signature)) {
    console.warn("[POST /api/webhooks/payment] rejected: invalid or missing signature");
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const parsed = webhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    // Signed by someone who holds our secret, but not a shape we
    // recognize — log for investigation, still 200 so it isn't retried.
    console.error("[POST /api/webhooks/payment] unexpected payload shape", payload);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const { reference, status, amount } = parsed.data;

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
    if (amount !== undefined && Number(transaction.amount) !== amount) {
      console.error(
        `[POST /api/webhooks/payment] amount mismatch for ${reference}: expected ${transaction.amount}, got ${amount}`
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
