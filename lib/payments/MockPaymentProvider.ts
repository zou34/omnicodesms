import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

import { PaymentProvider } from "@/lib/payments/PaymentProvider";
import type {
  InitializePaymentParams,
  InitializePaymentResult,
  WebhookVerificationResult,
} from "@/lib/payments/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * Stands in for a real aggregator so the checkout/webhook flow can be
 * built and tested end-to-end before one is chosen. `initializePayment`
 * hands back a URL to our own /mock-checkout page (a fake hosted payment
 * page) instead of a real gateway session. That page's "pay"/"cancel"
 * buttons call POST /api/mock-payment-gateway, which signs a payload with
 * the same HMAC scheme used here and delivers it to our own
 * /api/webhooks/payment — a faithful stand-in for how a real gateway's
 * servers notify us after a user completes checkout.
 */
export class MockPaymentProvider extends PaymentProvider {
  readonly name = "mock";

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const url = new URL("/mock-checkout", APP_URL);
    url.searchParams.set("reference", params.reference);
    url.searchParams.set("amount", String(params.amountFcfa));
    url.searchParams.set("description", params.description);
    url.searchParams.set("return_url", params.returnUrl);
    url.searchParams.set("cancel_url", params.cancelUrl);

    return { checkoutUrl: url.toString() };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerificationResult> {
    const signature = headers.get("x-webhook-signature");

    if (!isSignatureValid(rawBody, signature)) {
      return { valid: false, reason: "INVALID_SIGNATURE" };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { valid: false, reason: "MALFORMED_BODY" };
    }

    const parsed = webhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { valid: false, reason: "UNRECOGNIZED_PAYLOAD" };
    }

    return {
      valid: true,
      event: { reference: parsed.data.reference, status: parsed.data.status, amountFcfa: parsed.data.amount },
    };
  }
}
