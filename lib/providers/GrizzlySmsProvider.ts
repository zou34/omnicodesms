import { SmsProvider } from "@/lib/providers/SmsProvider";
import {
  ProviderError,
  type CancelResult,
  type ProviderBalance,
  type ProviderPrice,
  type RentedNumber,
  type SmsResult,
} from "@/lib/providers/types";

// https://api.grizzlysms.com/stubs/handler_api.php — the classic
// "SMS-Activate protocol" shared by many virtual-number resellers: most
// actions (getBalance, getNumber, getStatus, setStatus) return
// colon-delimited plain text, not JSON, while a few (getPrices,
// getCountries, getServicesList) return real JSON. Verified live against
// the real account: getBalance -> "ACCESS_BALANCE:0.0000", getPrices's
// JSON shape, and getNumber -> "NO_BALANCE" (the account had a 0 balance,
// which conveniently exercises the INSUFFICIENT_BALANCE path for free).
// getStatus/setStatus's response text and the ~20min activation TTL are
// per GrizzlySMS's published docs, not live-verified here — spending real
// balance to buy a number wasn't part of this chantier.
const BASE_URL = "https://api.grizzlysms.com/stubs/handler_api.php";

// GrizzlySMS identifie ses pays par un entier et ne publie que des noms
// anglais (GET ?action=getCountries — 206 pays), jamais de code ISO. La
// correspondance est donc construite au premier appel en rapprochant ces noms
// de ceux que l'ICU associe à notre code ISO, puis mise en cache pour la durée
// du process.
//
// Sans cette résolution dynamique, seuls les 8 pays de la table de secours
// ci-dessous étaient achetables : le repli depuis 5sim échouait donc en
// UNSUPPORTED_COUNTRY_SERVICE sur la quasi-totalité du catalogue.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  // Les six pays de notre catalogue dont le nom chez GrizzlySMS ne correspond
  // à aucune graphie ICU — relevés en direct sur leur API.
  AR: "Argentinas",
  CI: "Ivory Coast",
  CZ: "Czech",
  HK: "Hong Kong", // l'ICU dit "Hong Kong SAR China"
  LA: "Lao",
  SV: "Salvador",
  US: "USA", // et non "USA (2)", qui est un second pool distinct
};

// Filet de sécurité hors ligne, si leur catalogue des pays est injoignable.
// Confirmed via GET ?action=getCountries against the real API.
const FALLBACK_COUNTRY_IDS: Record<string, string> = {
  ID: "6",
  GB: "16",
  NG: "19",
  CI: "27",
  DE: "43",
  BR: "73",
  FR: "78",
  US: "187",
};

function normalizeCountryName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const englishRegionNames = new Intl.DisplayNames(["en"], { type: "region" });

let countryIdsByName: Map<string, string> | null = null;

async function loadCountryIdsByName(): Promise<Map<string, string> | null> {
  if (countryIdsByName) return countryIdsByName;

  const apiKey = process.env.GRIZZLY_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("action", "getCountries");

    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as Record<string, { id: number; eng: string }>;
    const byName = new Map<string, string>();
    for (const entry of Object.values(data)) {
      byName.set(normalizeCountryName(entry.eng), String(entry.id));
    }

    countryIdsByName = byName;
    return byName;
  } catch (error) {
    console.error(
      "[GrizzlySmsProvider] catalogue pays indisponible, repli sur la table statique",
      error
    );
    return null;
  }
}

/** Résout un code ISO 3166-1 alpha-2 en identifiant de pays GrizzlySMS. */
export async function resolveGrizzlyCountryId(isoCode: string): Promise<string | undefined> {
  const byName = await loadCountryIdsByName();
  if (!byName) return FALLBACK_COUNTRY_IDS[isoCode];

  const alias = COUNTRY_NAME_ALIASES[isoCode];
  if (alias) {
    const id = byName.get(normalizeCountryName(alias));
    if (id) return id;
  }

  let icuName: string | undefined;
  try {
    icuName = englishRegionNames.of(isoCode);
  } catch {
    icuName = undefined;
  }
  if (icuName) {
    const id = byName.get(normalizeCountryName(icuName));
    if (id) return id;
  }

  return FALLBACK_COUNTRY_IDS[isoCode];
}

// Confirmed via GET ?action=getServicesList against the real API.
const SERVICE_CODES: Record<string, string> = {
  whatsapp: "wa",
  telegram: "tg",
  facebook: "fb",
  google: "go",
  instagram: "ig",
  tiktok: "lf",
  twitter: "tw",
  discord: "ds",
  // No separate YouTube code: a YouTube account is a Google account, verified
  // with the same "go" code (same stock, same price).
  youtube: "go",
};

const ACTIVATION_TTL_MS = 20 * 60 * 1000;

export class GrizzlySmsProvider extends SmsProvider {
  readonly name = "grizzly";

  private async requestRaw(params: Record<string, string>): Promise<string> {
    const apiKey = process.env.GRIZZLY_API_KEY;
    if (!apiKey) {
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      console.error("[GrizzlySmsProvider] network error", error);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    const raw = await response.text();

    if (!response.ok) {
      console.error(`[GrizzlySmsProvider] HTTP ${response.status}`, raw);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    return raw.trim();
  }

  private async requestJson<T>(params: Record<string, string>): Promise<T> {
    const raw = await this.requestRaw(params);
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error("[GrizzlySmsProvider] invalid JSON response", raw, error);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }
  }

  async getBalance(): Promise<ProviderBalance> {
    const raw = await this.requestRaw({ action: "getBalance" });
    const match = raw.match(/^ACCESS_BALANCE:([\d.]+)$/);

    if (!match) {
      console.error("[GrizzlySmsProvider] unexpected getBalance response", raw);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    return { amount: Number(match[1]), currency: "RUB" };
  }

  async getPrices(country: string, service: string): Promise<ProviderPrice> {
    const countryId = await resolveGrizzlyCountryId(country);
    const serviceCode = SERVICE_CODES[service];
    if (!countryId || !serviceCode) {
      throw new ProviderError(
        `Pays ou service non supporté par GrizzlySMS: ${service}/${country}.`,
        "UNSUPPORTED_COUNTRY_SERVICE"
      );
    }

    const data = await this.requestJson<Record<string, Record<string, { cost: number; count: number }>>>(
      { action: "getPrices", country: countryId, service: serviceCode }
    );

    const entry = data[countryId]?.[serviceCode];
    if (!entry) {
      throw new ProviderError(
        `Aucune offre GrizzlySMS pour ${service}/${country}.`,
        "UNSUPPORTED_COUNTRY_SERVICE"
      );
    }

    return { country, service, price: entry.cost, currency: "RUB", available: entry.count };
  }

  async rentNumber(country: string, service: string): Promise<RentedNumber> {
    const countryId = await resolveGrizzlyCountryId(country);
    const serviceCode = SERVICE_CODES[service];
    if (!countryId || !serviceCode) {
      throw new ProviderError(
        `Pays ou service non supporté par GrizzlySMS: ${service}/${country}.`,
        "UNSUPPORTED_COUNTRY_SERVICE"
      );
    }

    // getNumber's success response carries no price field (just the id and
    // phone — verified live) — fetch it separately so the caller still
    // gets an accurate RentedNumber.price.
    const priceInfo = await this.getPrices(country, service).catch(() => null);

    const raw = await this.requestRaw({ action: "getNumber", service: serviceCode, country: countryId });

    if (raw === "NO_BALANCE") {
      throw new ProviderError("Solde insuffisant sur le compte fournisseur.", "INSUFFICIENT_BALANCE");
    }
    if (raw === "NO_NUMBERS") {
      throw new ProviderError("Plus de numéro disponible pour ce pays/service.", "NO_NUMBERS_AVAILABLE");
    }

    const match = raw.match(/^ACCESS_NUMBER:(\d+):(.+)$/);
    if (!match) {
      console.error("[GrizzlySmsProvider] unexpected getNumber response", raw);
      throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
    }

    const [, id, phone] = match;

    return {
      providerOrderId: id,
      phoneNumber: phone.startsWith("+") ? phone : `+${phone}`,
      country,
      service,
      price: priceInfo?.price ?? 0,
      currency: "RUB",
      expiresAt: new Date(Date.now() + ACTIVATION_TTL_MS),
    };
  }

  async getSms(orderId: string): Promise<SmsResult> {
    const raw = await this.requestRaw({ action: "getStatus", id: orderId });

    if (raw === "NO_ACTIVATION") {
      throw new ProviderError(`Commande GrizzlySMS introuvable: ${orderId}.`, "ORDER_NOT_FOUND");
    }
    if (raw === "STATUS_CANCEL") {
      return { status: "CANCELLED", code: null, fullText: null };
    }
    if (raw === "STATUS_WAIT_CODE" || raw === "STATUS_WAIT_RESEND" || raw.startsWith("STATUS_WAIT_RETRY")) {
      return { status: "PENDING", code: null, fullText: null };
    }

    const okMatch = raw.match(/^STATUS_OK:(.+)$/);
    if (okMatch) {
      return { status: "RECEIVED", code: okMatch[1], fullText: null };
    }

    console.error("[GrizzlySmsProvider] unexpected getStatus response", raw);
    throw new ProviderError("Service temporairement indisponible.", "PROVIDER_UNAVAILABLE");
  }

  async cancelOrder(orderId: string): Promise<CancelResult> {
    const raw = await this.requestRaw({ action: "setStatus", id: orderId, status: "8" });

    if (raw === "NO_ACTIVATION") {
      throw new ProviderError(`Commande GrizzlySMS introuvable: ${orderId}.`, "ORDER_NOT_FOUND");
    }
    if (raw === "ACCESS_CANCEL") {
      return { success: true, status: "CANCELLED" };
    }

    // e.g. EARLY_CANCEL_DENIED — too soon to cancel. Nothing changed.
    return { success: false, status: "PENDING" };
  }
}
