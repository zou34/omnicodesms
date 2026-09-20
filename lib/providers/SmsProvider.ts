import type {
  CancelResult,
  ProviderBalance,
  ProviderPrice,
  RentedNumber,
  SmsResult,
} from "@/lib/providers/types";

/**
 * Contract every SMS/virtual-number provider integration must implement
 * (5sim, GrizzlySMS, ...). Keeping this as an
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

  /** Rents a fresh virtual number for the given (country, service) pair.
   *  sellingPriceFcfa — prix de vente catalogue. Fourni, il arme le garde-fou
   *  marge (lib/providers/margin-guard.ts) : tout fournisseur refuse alors
   *  l'achat si le coût réel converti en FCFA atteint ce prix de vente, ou si
   *  ce coût ne peut pas être établi. Omis, l'achat n'est pas arbitré — à
   *  réserver aux scripts de diagnostic, jamais au tunnel d'achat client. */
  abstract rentNumber(country: string, service: string, sellingPriceFcfa?: number): Promise<RentedNumber>;

  /** Polls the current SMS status/content for a previously rented number. */
  abstract getSms(orderId: string): Promise<SmsResult>;

  /** Cancels a rental (e.g. no SMS received in time, or user gave up). */
  abstract cancelOrder(orderId: string): Promise<CancelResult>;
}
