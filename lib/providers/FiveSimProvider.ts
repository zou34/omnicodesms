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

// https://5sim.net/v1 — verified live against the real account during
// integration: GET /user/profile (auth + response shape), GET
// /guest/products/{country}/any (price/stock shape), and the "not enough
// user balance" plain-text 400 on /user/buy (the account had a 0 balance,
// which conveniently exercises the INSUFFICIENT_BALANCE path for free).
// The success shapes of buy/check/cancel are per 5sim's public docs, not
// live-verified here — spending real balance to buy a number wasn't part
// of this chantier.
const BASE_URL = "https://5sim.net/v1";

// 5sim countries are keyed by English name, not ISO code — this maps our 8
// seeded Country.code values to 5sim's slugs, confirmed via GET
// /guest/countries (each entry has an `iso` map keyed by lowercase ISO
// code, e.g. {"usa": {..., iso: {"us": 1}}}). Extend this if new countries
// are added to prisma/seed.ts.
const COUNTRY_SLUGS: Record<string, string> = {
  US: "usa",
  GB: "england",
  FR: "france",
  DE: "germany",
  NG: "nigeria",
  CI: "ivorycoast",
  ID: "indonesia",
  BR: "brazil",
};

// 5sim's product slugs are identical to our own Service.slug values
// (confirmed via GET /guest/products/usa/any: whatsapp, telegram, facebook,
// google, instagram, tiktok, twitter, discord all matched as-is) — no
// mapping table needed.

interface FiveSimOrder {
  id: number;
  phone: string;
  product: string;
  price: number;
  status: "PENDING" | "RECEIVED" | "CANCELED" | "TIMEOUT" | "FINISHED" | "BANNED";
  expires: string;
  sms: { code: string | null; text: string | null }[] | null;
}

function mapStatus(status: FiveSimOrder["status"]): SmsStatus {
  switch (status) {
    case "RECEIVED":
    case "FINISHED":
      return "RECEIVED";
    case "TIMEOUT":
      return "EXPIRED";
    case "CANCELED":
    case "BANNED":
      return "CANCELLED";
    case "PENDING":
    default:
      return "PENDING";
  }
}

export class FiveSimProvider extends SmsProvider {
  readonly name = "5sim";

  private async request<T>(path: string): Promise<T> {
    const apiKey = process.env.SIM5_API_KEY;
    if (!apiKey) {
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
    } catch (error) {
      console.error("[FiveSimProvider] network error", error);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    const raw = await response.text();

    if (!response.ok) {
      // 5sim's error responses are plain text on failure, not JSON —
      // verified live: `"not enough user balance"` (HTTP 400, buy) and
      // `"order not found"` (HTTP 404, check/cancel) are two genuinely
      // different situations and must not share a pattern.
      if (/balance/i.test(raw)) {
        throw new ProviderError("Solde insuffisant sur le compte fournisseur.", "INSUFFICIENT_BALANCE");
      }
      if (/not found/i.test(raw)) {
        throw new ProviderError(`Commande 5sim introuvable.`, "ORDER_NOT_FOUND");
      }
      if (/no free phones/i.test(raw)) {
        throw new ProviderError("Plus de numéro disponible pour ce pays/service.", "NO_NUMBERS_AVAILABLE");
      }
      console.error(`[FiveSimProvider] HTTP ${response.status}`, raw);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error("[FiveSimProvider] invalid JSON response", raw, error);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }
  }

  async getBalance(): Promise<ProviderBalance> {
    const data = await this.request<{ balance: number }>("/user/profile");
    return { amount: data.balance, currency: "RUB" };
  }

  async getPrices(country: string, service: string): Promise<ProviderPrice> {
    const slug = COUNTRY_SLUGS[country];
    if (!slug) {
      throw new ProviderError(`Pays non supporté par 5sim: ${country}.`, "UNSUPPORTED_COUNTRY_SERVICE");
    }

    // The "any operator" aggregate — a single flat price/stock figure,
    // matching the operator strategy used by rentNumber below.
    const data = await this.request<Record<string, { Qty: number; Price: number }>>(
      `/guest/products/${slug}/any`
    );

    const entry = data[service];
    if (!entry) {
      throw new ProviderError(
        `Aucune offre 5sim pour ${service}/${country}.`,
        "UNSUPPORTED_COUNTRY_SERVICE"
      );
    }

    return { country, service, price: entry.Price, currency: "RUB", available: entry.Qty };
  }

  async rentNumber(country: string, service: string): Promise<RentedNumber> {
    const slug = COUNTRY_SLUGS[country];
    if (!slug) {
      throw new ProviderError(`Pays non supporté par 5sim: ${country}.`, "UNSUPPORTED_COUNTRY_SERVICE");
    }

    const order = await this.request<FiveSimOrder>(`/user/buy/activation/${slug}/any/${service}`);

    return {
      providerOrderId: String(order.id),
      phoneNumber: order.phone.startsWith("+") ? order.phone : `+${order.phone}`,
      country,
      service,
      price: order.price,
      currency: "RUB",
      expiresAt: new Date(order.expires),
    };
  }

  async getSms(orderId: string): Promise<SmsResult> {
    const order = await this.request<FiveSimOrder>(`/user/check/${encodeURIComponent(orderId)}`);
    const sms = order.sms?.[0] ?? null;

    return {
      status: mapStatus(order.status),
      code: sms?.code ?? null,
      fullText: sms?.text ?? null,
    };
  }

  async cancelOrder(orderId: string): Promise<CancelResult> {
    const order = await this.request<FiveSimOrder>(`/user/cancel/${encodeURIComponent(orderId)}`);
    const status = mapStatus(order.status);

    return { success: status === "CANCELLED", status };
  }
}
