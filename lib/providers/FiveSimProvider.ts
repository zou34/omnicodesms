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

// 5sim identifie ses pays par un slug anglais, pas par code ISO. La table
// ci-dessous n'est qu'un filet de sécurité hors ligne : la correspondance
// réelle est construite au premier appel depuis GET /guest/countries (153
// pays, chacun exposant une map `iso` en minuscules, ex. {"usa": {iso:
// {"us": 1}}}), puis mise en cache pour la durée du process.
//
// Cette résolution dynamique évite qu'un pays présent au catalogue soit
// refusé à l'achat simplement parce qu'il manquait dans une table figée.
const FALLBACK_COUNTRY_SLUGS: Record<string, string> = {
  US: "usa",
  GB: "england",
  FR: "france",
  DE: "germany",
  NG: "nigeria",
  CI: "ivorycoast",
  ID: "indonesia",
  BR: "brazil",
};

interface FiveSimCountry {
  iso?: Record<string, number>;
}

let countrySlugCache: Record<string, string> | null = null;

/**
 * Construit (et met en cache) la correspondance code ISO -> slug 5sim à
 * partir du catalogue public de 5sim. L'endpoint est "guest" : il ne
 * consomme aucun crédit et ne demande aucune authentification.
 *
 * En cas d'échec réseau, on retombe sur FALLBACK_COUNTRY_SLUGS plutôt que
 * de faire échouer tous les achats.
 */
export async function getFiveSimCountrySlugs(): Promise<Record<string, string>> {
  if (countrySlugCache) return countrySlugCache;

  try {
    const response = await fetch(`${BASE_URL}/guest/countries`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as Record<string, FiveSimCountry>;
    const map: Record<string, string> = { ...FALLBACK_COUNTRY_SLUGS };

    for (const [slug, entry] of Object.entries(data)) {
      for (const iso of Object.keys(entry.iso ?? {})) {
        map[iso.toUpperCase()] = slug;
      }
    }

    countrySlugCache = map;
    return map;
  } catch (error) {
    console.error("[FiveSimProvider] catalogue pays indisponible, repli sur la table statique", error);
    return FALLBACK_COUNTRY_SLUGS;
  }
}

// 5sim's product slugs match our own Service.slug values as-is (confirmed via
// GET /guest/products/usa/any: whatsapp, telegram, facebook, google,
// instagram, tiktok, twitter, discord) — except for services 5sim doesn't sell
// as a separate product. There is no "youtube" product: a YouTube account is
// a Google account, so it's verified with the "google" product (same number
// pool, same price).
const PRODUCT_ALIASES: Record<string, string> = {
  youtube: "google",
};

/** Maps one of our Service.slug values to the 5sim product that sells it. */
export function toFiveSimProduct(service: string): string {
  return PRODUCT_ALIASES[service] ?? service;
}

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
    const slug = (await getFiveSimCountrySlugs())[country];
    if (!slug) {
      throw new ProviderError(`Pays non supporté par 5sim: ${country}.`, "UNSUPPORTED_COUNTRY_SERVICE");
    }

    // The "any operator" aggregate — a single flat price/stock figure,
    // matching the operator strategy used by rentNumber below.
    const data = await this.request<Record<string, { Qty: number; Price: number }>>(
      `/guest/products/${slug}/any`
    );

    const entry = data[toFiveSimProduct(service)];
    if (!entry) {
      throw new ProviderError(
        `Aucune offre 5sim pour ${service}/${country}.`,
        "UNSUPPORTED_COUNTRY_SERVICE"
      );
    }

    return { country, service, price: entry.Price, currency: "RUB", available: entry.Qty };
  }

  async rentNumber(country: string, service: string): Promise<RentedNumber> {
    const slug = (await getFiveSimCountrySlugs())[country];
    if (!slug) {
      throw new ProviderError(`Pays non supporté par 5sim: ${country}.`, "UNSUPPORTED_COUNTRY_SERVICE");
    }

    const order = await this.request<FiveSimOrder>(
      `/user/buy/activation/${slug}/any/${toFiveSimProduct(service)}`
    );

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
