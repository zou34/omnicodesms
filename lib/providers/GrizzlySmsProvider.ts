import { SmsProvider } from "@/lib/providers/SmsProvider";
import {
  ProviderError,
  type CancelResult,
  type ProviderBalance,
  type ProviderPrice,
  type RentedNumber,
  type SmsResult,
} from "@/lib/providers/types";
import { assertPositiveMargin } from "@/lib/providers/margin-guard";

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

// Table ISO -> id GrizzlySMS, générée le 2026-09-24 depuis GET ?action=getCountries
// (même rapprochement de noms que loadCountryIdsByName ci-dessous). Consultée EN
// PREMIER : en production, l'appel getCountries au démarrage de chaque instance
// serverless pouvait échouer ou expirer, et le repli ne connaissait alors que 8
// pays — d'où les UNSUPPORTED_COUNTRY_SERVICE (ex. twitter/VN). La résolution
// dynamique ne sert plus qu'aux pays absents de cette table.
const STATIC_COUNTRY_IDS: Record<string, string> = {
  AD: "1062", AE: "95", AF: "74", AI: "181", AL: "155", AM: "148", AO: "76", AR: "39",
  AS: "10161", AT: "50", AU: "175", AW: "179", AZ: "35", BB: "118", BD: "60", BE: "82",
  BF: "152", BG: "83", BH: "145", BI: "119", BJ: "120", BM: "1003", BO: "92", BR: "73",
  BS: "122", BT: "158", BW: "123", BY: "51", BZ: "124", CA: "36", CF: "125", CH: "173",
  CI: "27", CL: "151", CM: "41", CN: "3", CO: "33", CR: "93", CU: "113", CV: "186",
  CY: "77", CZ: "63", DE: "43", DJ: "168", DK: "172", DM: "126", DO: "109", DZ: "58",
  EC: "105", EE: "34", EG: "21", ER: "176", ES: "56", ET: "71", FI: "163", FJ: "189",
  FR: "78", GA: "154", GB: "16", GD: "127", GE: "128", GF: "162", GH: "38", GI: "201",
  GL: "1008", GM: "28", GN: "68", GP: "160", GQ: "167", GR: "129", GT: "94", GW: "130",
  GY: "131", HK: "14", HN: "88", HR: "45", HT: "26", HU: "84", ID: "6", IE: "23",
  IL: "13", IN: "22", IQ: "47", IR: "10016", IS: "132", IT: "86", JM: "103", JO: "116",
  JP: "182", KE: "8", KG: "11", KH: "24", KM: "133", KR: "10350", KW: "100", KY: "170",
  KZ: "2", LA: "25", LB: "153", LI: "10348", LK: "64", LR: "135", LS: "136", LT: "44",
  LU: "165", LV: "49", LY: "102", MA: "37", MC: "144", MD: "85", ME: "171", MG: "17",
  ML: "69", MN: "72", MQ: "1011", MR: "114", MS: "180", MT: "199", MU: "157", MV: "159",
  MW: "137", MX: "54", MY: "7", MZ: "80", NC: "185", NE: "139", NG: "19", NI: "90",
  NL: "48", NO: "174", NP: "81", NU: "204", NZ: "67", OM: "107", PA: "112", PE: "65",
  PF: "1012", PH: "4", PK: "66", PL: "15", PR: "97", PT: "117", PY: "87", QA: "111",
  RE: "146", RO: "32", RS: "29", RW: "140", SA: "53", SC: "184", SE: "46", SG: "10351",
  SI: "59", SK: "141", SL: "115", SN: "61", SO: "149", SR: "142", SS: "177", SV: "101",
  SX: "10349", SY: "110", TD: "42", TG: "99", TH: "52", TJ: "143", TL: "91", TM: "161",
  TN: "89", TO: "10227", TW: "55", TZ: "9", UA: "1", UG: "75", US: "187", UY: "156",
  UZ: "40", VE: "70", VN: "10", VU: "1007", WS: "10231", XK: "203", YE: "30", ZA: "31",
  ZM: "147", ZW: "96",
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
  const staticId = STATIC_COUNTRY_IDS[isoCode];
  if (staticId) return staticId;

  const byName = await loadCountryIdsByName();
  if (!byName) return undefined;

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

  return undefined;
}

// Confirmed via GET ?action=getServicesList against the real API.
export const SERVICE_CODES: Record<string, string> = {
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
  vinted: "kc",
  // GrizzlySMS renomme les marques déposées dans son catalogue : "oi" y est
  // listé "Tind Swipe App" et "dr" "AI Chat", alors que ce sont les codes du
  // protocole sms-activate pour Tinder et OpenAI — les mêmes que ceux déjà
  // utilisés ci-dessus (wa, tg, fb, go...). Ne cherchez donc pas "Tinder" ou
  // "OpenAI" dans getServicesList : vous ne les trouverez pas sous ce nom.
  // Stock confirmé en direct : ~200 pays pour chacun des deux codes.
  tinder: "oi",
  openai: "dr",
};

// Même délai que chez 5sim : un fournisseur qui ne répond pas ne doit jamais
// immobiliser la requête d'achat.
const REQUEST_TIMEOUT_MS = 8_000;
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
      response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
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

    // USD, et non RUB : relevé en direct, ACCESS_BALANCE:6.0048 pour un compte
    // crédité de 6 $. Voir getProviderUsdToFcfa() dans lib/pricing.ts.
    return { amount: Number(match[1]), currency: "USD" };
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

    return { country, service, price: entry.cost, currency: "USD", available: entry.count };
  }

  async rentNumber(country: string, service: string, sellingPriceFcfa?: number): Promise<RentedNumber> {
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
    // Une seconde tentative : un simple hoquet réseau ne doit pas suffire à
    // faire refuser la vente par le garde-fou marge ci-dessous.
    const priceInfo = await this.getPrices(country, service)
      .catch(() => this.getPrices(country, service))
      .catch(() => null);

    // Garde-fou marge : getPrices est le seul chiffrage dont on dispose ici,
    // et il est de toute façon déjà demandé ci-dessus — le contrôle ne coûte
    // donc aucun appel réseau supplémentaire.
    assertPositiveMargin({
      provider: "GrizzlySmsProvider",
      country,
      service,
      costUsd: priceInfo?.price ?? null,
      sellingPriceFcfa,
    });

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
      currency: "USD",
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
