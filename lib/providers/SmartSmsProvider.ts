import { FiveSimProvider } from "@/lib/providers/FiveSimProvider";
import { GrizzlySmsProvider } from "@/lib/providers/GrizzlySmsProvider";
import { SmsProvider } from "@/lib/providers/SmsProvider";
import {
  ProviderError,
  type CancelResult,
  type ProviderBalance,
  type ProviderPrice,
  type RentedNumber,
  type SmsResult,
} from "@/lib/providers/types";

type SubProviderKey = "5sim" | "grizzly";

// providerOrderId is prefixed with which sub-provider actually fulfilled the
// order ("5sim:12345" / "grizzly:67890") so a later getSms/cancelOrder call —
// possibly from a different request, after this Order.providerId has made a
// full round-trip through the database — still reaches the right account.
// An in-memory map keyed by order id would lose that routing on a server
// restart; the prefix survives it for free since it travels with the id.
function encodeOrderId(provider: SubProviderKey, rawId: string): string {
  return `${provider}:${rawId}`;
}

function decodeOrderId(orderId: string): { provider: SubProviderKey; rawId: string } {
  const separatorIndex = orderId.indexOf(":");
  if (separatorIndex === -1) {
    throw new ProviderError(`Commande introuvable: ${orderId}.`, "ORDER_NOT_FOUND");
  }

  const provider = orderId.slice(0, separatorIndex);
  const rawId = orderId.slice(separatorIndex + 1);

  if (provider !== "5sim" && provider !== "grizzly") {
    throw new ProviderError(`Commande introuvable: ${orderId}.`, "ORDER_NOT_FOUND");
  }

  return { provider, rawId };
}

/**
 * Cost-optimized routing: 5sim is the primary provider (tried first on
 * every purchase), GrizzlySMS the secondary — used only when 5sim fails,
 * for any reason (out of stock, insufficient balance, network/API error).
 * Read-only lookups (getBalance/getPrices) follow the same primary→
 * secondary order so a single reported figure still means something
 * (whichever provider is actually being used for reads), rather than
 * conflating two independent accounts into one number.
 */
export class SmartSmsProvider extends SmsProvider {
  readonly name = "smart";

  private readonly fiveSim = new FiveSimProvider();
  private readonly grizzly = new GrizzlySmsProvider();

  private providerFor(key: SubProviderKey): FiveSimProvider | GrizzlySmsProvider {
    return key === "5sim" ? this.fiveSim : this.grizzly;
  }

  private async withFallback<T>(fn: (provider: SmsProvider) => Promise<T>, action: string): Promise<T> {
    try {
      return await fn(this.fiveSim);
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;

      console.warn(`[SmartSmsProvider] 5sim failed for ${action} (${error.code}), falling back to GrizzlySMS`);

      try {
        return await fn(this.grizzly);
      } catch (fallbackError) {
        if (!(fallbackError instanceof ProviderError)) throw fallbackError;

        console.error(
          `[SmartSmsProvider] GrizzlySMS also failed for ${action} (${fallbackError.code}) — no provider available`
        );
        throw fallbackError;
      }
    }
  }

  async getBalance(): Promise<ProviderBalance> {
    return this.withFallback((provider) => provider.getBalance(), "getBalance");
  }

  async getPrices(country: string, service: string): Promise<ProviderPrice> {
    return this.withFallback((provider) => provider.getPrices(country, service), "getPrices");
  }

  async rentNumber(country: string, service: string): Promise<RentedNumber> {
    try {
      const rental = await this.fiveSim.rentNumber(country, service);
      return { ...rental, providerOrderId: encodeOrderId("5sim", rental.providerOrderId) };
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;

      console.warn(`[SmartSmsProvider] 5sim rentNumber failed (${error.code}), falling back to GrizzlySMS`);

      try {
        const rental = await this.grizzly.rentNumber(country, service);
        return { ...rental, providerOrderId: encodeOrderId("grizzly", rental.providerOrderId) };
      } catch (fallbackError) {
        if (!(fallbackError instanceof ProviderError)) throw fallbackError;

        console.error(
          `[SmartSmsProvider] GrizzlySMS also failed for rentNumber (${fallbackError.code}) — no provider available`
        );
        throw fallbackError;
      }
    }
  }

  async getSms(orderId: string): Promise<SmsResult> {
    const { provider, rawId } = decodeOrderId(orderId);
    return this.providerFor(provider).getSms(rawId);
  }

  async cancelOrder(orderId: string): Promise<CancelResult> {
    const { provider, rawId } = decodeOrderId(orderId);
    return this.providerFor(provider).cancelOrder(rawId);
  }
}
