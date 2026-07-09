// Shared vocabulary for every SMS provider integration (mock or real).
// Deliberately decoupled from the Prisma models: a provider's own status
// vocabulary and identifiers don't have to match our internal `Order` model
// 1:1 — the code that consumes `SmsProvider` is responsible for mapping
// between the two.

export interface ProviderBalance {
  amount: number;
  currency: string;
}

export interface ProviderPrice {
  country: string; // ISO 3166-1 alpha-2, e.g. "US"
  service: string; // service slug, e.g. "whatsapp"
  price: number;
  currency: string;
  available: number; // number of numbers currently in stock for this pair
}

export interface RentedNumber {
  providerOrderId: string;
  phoneNumber: string;
  country: string;
  service: string;
  price: number;
  currency: string;
  expiresAt: Date;
}

export type SmsStatus = "PENDING" | "RECEIVED" | "CANCELLED" | "EXPIRED";

export interface SmsResult {
  status: SmsStatus;
  code: string | null;
  fullText: string | null;
}

export interface CancelResult {
  success: boolean;
  status: SmsStatus;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INSUFFICIENT_BALANCE"
      | "NO_NUMBERS_AVAILABLE"
      | "ORDER_NOT_FOUND"
      | "UNSUPPORTED_COUNTRY_SERVICE"
      | "PROVIDER_UNAVAILABLE"
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
