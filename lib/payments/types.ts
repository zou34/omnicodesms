// Shared vocabulary for every payment gateway integration (mock or real).
// Kept decoupled from Prisma's Transaction model the same way
// lib/providers/types.ts decouples SMS providers from Order — the route
// layer is what maps between the two.

export interface InitializePaymentParams {
  reference: string; // our own Transaction.providerRef — the id the webhook will confirm against
  amountFcfa: number;
  description: string;
  customerEmail: string;
  returnUrl: string; // browser redirect target on success
  cancelUrl: string; // browser redirect target on cancel/failure
}

export interface InitializePaymentResult {
  checkoutUrl: string;
}

export type PaymentEventStatus = "SUCCESS" | "FAILED";

export interface VerifiedPaymentEvent {
  reference: string;
  status: PaymentEventStatus;
  amountFcfa?: number; // only when the gateway's webhook includes it
}

// Mirrors the three distinct outcomes app/api/webhooks/payment/route.ts
// already needs to tell apart (different HTTP status per case) — a plain
// `null` couldn't carry that distinction, and each provider has its own
// idea of what "invalid signature" vs "unreadable body" vs "a shape I
// don't recognize" looks like.
export type WebhookVerificationResult =
  | { valid: true; event: VerifiedPaymentEvent }
  | { valid: false; reason: "INVALID_SIGNATURE" | "MALFORMED_BODY" | "UNRECOGNIZED_PAYLOAD" };

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "GATEWAY_UNAVAILABLE"
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
