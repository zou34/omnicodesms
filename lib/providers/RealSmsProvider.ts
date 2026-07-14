import { SmsProvider } from "@/lib/providers/SmsProvider";
import {
  ProviderError,
  type CancelResult,
  type ProviderBalance,
  type ProviderPrice,
  type RentedNumber,
  type SmsResult,
  type SmsStatus,
} from "@/lib/providers/types";

// Talks to a real virtual-number provider over HTTP (5sim / SMS-Activate /
// DaisySMS all expose something in this shape — a REST API keyed by
// SMS_PROVIDER_API_KEY, with the base URL configurable per-provider since
// they don't share one). Field names below WILL need adjusting to match
// whichever provider is finally picked — this is a faithful skeleton of
// the request/response shape, not a verified contract with a live API.
interface RealSmsProviderConfig {
  apiKey: string;
  baseUrl: string;
}

function readConfig(): RealSmsProviderConfig | null {
  const apiKey = process.env.SMS_PROVIDER_API_KEY;
  const baseUrl = process.env.SMS_PROVIDER_BASE_URL;

  if (!apiKey || !baseUrl) return null;

  return { apiKey, baseUrl };
}

/** Maps an upstream HTTP failure to the closest ProviderError code. */
function errorForStatus(status: number): ProviderError {
  if (status === 404 || status === 409 || status === 410) {
    return new ProviderError("Plus de numéro disponible pour ce pays/service.", "NO_NUMBERS_AVAILABLE");
  }

  if (status === 402) {
    return new ProviderError(
      "Solde insuffisant sur le compte fournisseur.",
      "INSUFFICIENT_BALANCE"
    );
  }

  // 401/403/5xx/timeouts/etc. — nothing the caller can act on beyond
  // "try again later", so they all collapse to the same generic code.
  return new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
}

export class RealSmsProvider extends SmsProvider {
  readonly name = "real";

  /**
   * Shared request helper: fails gracefully with a clear ProviderError —
   * both when no API key/base URL is configured (item 1's explicit
   * requirement) and when the upstream call itself fails (network error,
   * timeout, non-2xx response) — rather than letting a raw fetch/parse
   * error bubble up as an unhandled 500.
   */
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const config = readConfig();

    if (!config) {
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          ...init?.headers,
        },
      });
    } catch (error) {
      console.error("[RealSmsProvider] network error", error);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    if (!response.ok) {
      throw errorForStatus(response.status);
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      console.error("[RealSmsProvider] invalid response body", error);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }
  }

  async getBalance(): Promise<ProviderBalance> {
    const data = await this.request<{ balance: number; currency: string }>("/account/balance");
    return { amount: data.balance, currency: data.currency };
  }

  async getPrices(country: string, service: string): Promise<ProviderPrice> {
    const data = await this.request<{ price: number; currency: string; available: number }>(
      `/prices?country=${encodeURIComponent(country)}&service=${encodeURIComponent(service)}`
    );

    return {
      country,
      service,
      price: data.price,
      currency: data.currency,
      available: data.available,
    };
  }

  // "Achat d'un numéro" — reserves and charges a real virtual number.
  async rentNumber(country: string, service: string): Promise<RentedNumber> {
    const data = await this.request<{
      id: string;
      phone_number: string;
      price: number;
      currency: string;
      expires_at: string;
    }>("/numbers", {
      method: "POST",
      body: JSON.stringify({ country, service }),
    });

    return {
      providerOrderId: data.id,
      phoneNumber: data.phone_number,
      country,
      service,
      price: data.price,
      currency: data.currency,
      expiresAt: new Date(data.expires_at),
    };
  }

  // "Vérification du statut du SMS" — polled while an Order is PENDING.
  async getSms(orderId: string): Promise<SmsResult> {
    const data = await this.request<{
      status: SmsStatus;
      code: string | null;
      full_text: string | null;
    }>(`/numbers/${encodeURIComponent(orderId)}`);

    return { status: data.status, code: data.code, fullText: data.full_text };
  }

  // "Annulation" — releases a number that hasn't received its SMS yet, or
  // that we couldn't finish recording on our own side (see the rollback
  // in app/api/orders/route.ts).
  async cancelOrder(orderId: string): Promise<CancelResult> {
    const data = await this.request<{ success: boolean; status: SmsStatus }>(
      `/numbers/${encodeURIComponent(orderId)}/cancel`,
      { method: "POST" }
    );

    return { success: data.success, status: data.status };
  }
}
