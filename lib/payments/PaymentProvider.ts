import type {
  InitializePaymentParams,
  InitializePaymentResult,
  WebhookVerificationResult,
} from "@/lib/payments/types";

/**
 * Contract every payment gateway integration must implement (CinetPay,
 * Paystack, the internal MockPaymentProvider, ...). An abstract class
 * rather than a plain interface for the same reason as SmsProvider — a
 * single place to hang shared config and let the factory do `instanceof`
 * checks if it ever needs to.
 *
 * Nothing outside lib/payments/** should know which gateway is active:
 * app/api/payments/checkout/route.ts and app/api/webhooks/payment/route.ts
 * only ever talk to this interface, never to a specific provider's API
 * shape. Adding a real gateway later means writing one new class here —
 * the checkout/webhook business logic (ledger writes, balance credit,
 * idempotency) never changes.
 */
export abstract class PaymentProvider {
  abstract readonly name: string;

  /** Starts a hosted checkout session and returns the URL to redirect the browser to. */
  abstract initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;

  /**
   * Verifies an inbound webhook delivery (signature, shape) and extracts
   * the event it represents. Takes the exact raw request body — signature
   * schemes are computed over raw bytes, not the parsed-and-restringified
   * JSON, which isn't guaranteed to match byte-for-byte.
   */
  abstract verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerificationResult>;
}
