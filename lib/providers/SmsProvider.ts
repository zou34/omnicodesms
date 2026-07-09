import type {
  CancelResult,
  ProviderBalance,
  ProviderPrice,
  RentedNumber,
  SmsResult,
} from "@/lib/providers/types";

/**
 * Contract every SMS/virtual-number provider integration must implement
 * (5sim, SMSHub, the internal MockProvider, ...). Keeping this as an
 * abstract class — rather than a plain interface — lets the Factory do
 * `instanceof SmsProvider` checks and gives concrete providers a single
 * place to hang shared config (e.g. `name`) via the constructor.
 */
export abstract class SmsProvider {
  abstract readonly name: string;

  /** Current balance available on the provider account. */
  abstract getBalance(): Promise<ProviderBalance>;

  /** Price and stock for a given (country, service) pair. */
  abstract getPrices(country: string, service: string): Promise<ProviderPrice>;

  /** Rents a fresh virtual number for the given (country, service) pair. */
  abstract rentNumber(country: string, service: string): Promise<RentedNumber>;

  /** Polls the current SMS status/content for a previously rented number. */
  abstract getSms(orderId: string): Promise<SmsResult>;

  /** Cancels a rental (e.g. no SMS received in time, or user gave up). */
  abstract cancelOrder(orderId: string): Promise<CancelResult>;
}
