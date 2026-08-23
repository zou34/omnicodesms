import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getPaymentProvider } from "@/lib/payments";

// `||`, not `??` — see app/layout.tsx for why an empty string must also fall back.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const bodySchema = z.object({
  reference: z.string().min(1),
  status: z.enum(["SUCCESS", "FAILED"]),
  amount: z.number().optional(),
});

// Stands in for a real aggregator's own servers: called by app/mock-checkout
// (the fake hosted payment page) once the "user" clicks pay/cancel, this
// signs a webhook payload with the shared secret and delivers it to our own
// /api/webhooks/payment — exactly what a real gateway would do after a
// checkout completes. Only does anything while MockPaymentProvider is the
// active provider; the moment PAYMENT_PROVIDER points at a real aggregator,
// this route is inert.
export async function POST(request: Request) {
  if (getPaymentProvider().name !== "mock") {
    return NextResponse.json({ error: "Non disponible." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 }
    );
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[POST /api/mock-payment-gateway] PAYMENT_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Passerelle de test mal configurée." }, { status: 500 });
  }

  const payload = JSON.stringify(parsed.data);
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  let webhookResponse: Response;
  try {
    webhookResponse = await fetch(`${APP_URL}/api/webhooks/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-signature": signature },
      body: payload,
    });
  } catch (error) {
    console.error("[POST /api/mock-payment-gateway] failed to deliver webhook", error);
    return NextResponse.json({ error: "Échec de livraison du webhook de test." }, { status: 502 });
  }

  return NextResponse.json({ delivered: webhookResponse.ok }, { status: 200 });
}
