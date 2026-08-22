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

interface MockOrder {
  providerOrderId: string;
  phoneNumber: string;
  country: string;
  service: string;
  price: number;
  status: SmsStatus;
  code: string | null;
  expiresAt: Date;
  receiveTimer: ReturnType<typeof setTimeout>;
}

// Mirrors prisma/seed.ts's `countries` list 1:1 (108 entries) so every
// country the picker offers can actually be "rented" through MockProvider
// — regenerate this block from that file if the seed list changes.
const DIAL_CODES: Record<string, string> = {
  US: "1",
  GB: "44",
  FR: "33",
  DE: "49",
  NG: "234",
  CI: "225",
  ID: "62",
  BR: "55",
  ES: "34",
  IT: "39",
  PT: "351",
  NL: "31",
  BE: "32",
  CH: "41",
  AT: "43",
  SE: "46",
  NO: "47",
  DK: "45",
  FI: "358",
  PL: "48",
  CZ: "420",
  SK: "421",
  HU: "36",
  RO: "40",
  BG: "359",
  GR: "30",
  IE: "353",
  IS: "354",
  UA: "380",
  RU: "7",
  TR: "90",
  HR: "385",
  RS: "381",
  SI: "386",
  EE: "372",
  LV: "371",
  LT: "370",
  LU: "352",
  CA: "1",
  MX: "52",
  AR: "54",
  CL: "56",
  CO: "57",
  PE: "51",
  VE: "58",
  EC: "593",
  BO: "591",
  PY: "595",
  UY: "598",
  CR: "506",
  PA: "507",
  GT: "502",
  HN: "504",
  SV: "503",
  NI: "505",
  DO: "1",
  CU: "53",
  JM: "1",
  CN: "86",
  JP: "81",
  KR: "82",
  IN: "91",
  PK: "92",
  BD: "880",
  LK: "94",
  NP: "977",
  VN: "84",
  TH: "66",
  PH: "63",
  MY: "60",
  SG: "65",
  MM: "95",
  KH: "855",
  LA: "856",
  TW: "886",
  HK: "852",
  MN: "976",
  KZ: "7",
  UZ: "998",
  IL: "972",
  SA: "966",
  AE: "971",
  QA: "974",
  KW: "965",
  BH: "973",
  OM: "968",
  JO: "962",
  LB: "961",
  IQ: "964",
  IR: "98",
  YE: "967",
  AZ: "994",
  GE: "995",
  ZA: "27",
  EG: "20",
  MA: "212",
  DZ: "213",
  TN: "216",
  KE: "254",
  TZ: "255",
  UG: "256",
  GH: "233",
  SN: "221",
  CM: "237",
  ET: "251",
  RW: "250",
  ZM: "260",
  ML: "223",
};

const BASE_PRICE_BY_SERVICE: Record<string, number> = {
  whatsapp: 100,
  telegram: 60,
  google: 90,
  facebook: 85,
  instagram: 85,
  twitter: 75,
  discord: 55,
  tiktok: 85,
};

const ORDER_TTL_MS = 10 * 60 * 1000; // 10 minutes, mirrors a typical real-world rental window

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function randomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

// Grouped for readability (e.g. "+1 234 567 890") rather than one long
// digit run — cosmetic only, no real per-country formatting rules, but
// looks like a real number for screenshots/demos.
function formatPhoneNumber(dialCode: string, digits: string): string {
  const groups = digits.match(/.{1,3}/g) ?? [digits];
  return `+${dialCode} ${groups.join(" ")}`;
}

/**
 * Simulates a real provider end-to-end: fake balance, plausible pricing,
 * fake phone numbers, and a rented number that "receives" a random SMS
 * code after a random delay — just like waiting on a real network. Lets
 * the rest of the app (UI, polling, order lifecycle) be built and tested
 * without spending real provider credits.
 */
export class MockProvider extends SmsProvider {
  readonly name = "mock";

  private orders = new Map<string, MockOrder>();
  private nextOrderId = 1;

  async getBalance(): Promise<ProviderBalance> {
    await randomDelay(100, 300);
    return { amount: 500_000, currency: "FCFA" };
  }

  async getPrices(country: string, service: string): Promise<ProviderPrice> {
    await randomDelay(100, 300);

    const dialCode = DIAL_CODES[country];
    const basePrice = BASE_PRICE_BY_SERVICE[service];

    if (!dialCode || !basePrice) {
      throw new ProviderError(
        `Aucune offre mock pour ${service}/${country}.`,
        "UNSUPPORTED_COUNTRY_SERVICE"
      );
    }

    // +/-10% jitter so repeated calls don't look perfectly static.
    const jitter = 0.9 + Math.random() * 0.2;
    const price = Math.round(basePrice * jitter);

    return {
      country,
      service,
      price,
      currency: "FCFA",
      available: Math.floor(Math.random() * 50) + 1,
    };
  }

  async rentNumber(country: string, service: string): Promise<RentedNumber> {
    await randomDelay(300, 800);

    const dialCode = DIAL_CODES[country];
    const basePrice = BASE_PRICE_BY_SERVICE[service];

    if (!dialCode || !basePrice) {
      throw new ProviderError(
        `Aucune offre mock pour ${service}/${country}.`,
        "UNSUPPORTED_COUNTRY_SERVICE"
      );
    }

    // ~5% chance of simulating a stock-out, to exercise error handling too.
    if (Math.random() < 0.05) {
      throw new ProviderError(
        `Plus de numéro disponible pour ${service}/${country}.`,
        "NO_NUMBERS_AVAILABLE"
      );
    }

    const providerOrderId = `mock_${this.nextOrderId++}_${Date.now()}`;
    const phoneNumber = formatPhoneNumber(dialCode, randomDigits(9));
    const expiresAt = new Date(Date.now() + ORDER_TTL_MS);

    // Simulates the SMS arriving after a random, realistic delay.
    const receiveTimer = setTimeout(() => {
      const order = this.orders.get(providerOrderId);
      if (order && order.status === "PENDING") {
        order.status = "RECEIVED";
        order.code = randomDigits(6);
      }
    }, Math.floor(Math.random() * 5000) + 3000); // 3-8s

    this.orders.set(providerOrderId, {
      providerOrderId,
      phoneNumber,
      country,
      service,
      price: basePrice,
      status: "PENDING",
      code: null,
      expiresAt,
      receiveTimer,
    });

    return {
      providerOrderId,
      phoneNumber,
      country,
      service,
      price: basePrice,
      currency: "FCFA",
      expiresAt,
    };
  }

  async getSms(orderId: string): Promise<SmsResult> {
    await randomDelay(100, 300);

    const order = this.orders.get(orderId);
    if (!order) {
      throw new ProviderError(`Commande mock introuvable: ${orderId}.`, "ORDER_NOT_FOUND");
    }

    if (order.status === "PENDING" && order.expiresAt.getTime() < Date.now()) {
      clearTimeout(order.receiveTimer);
      order.status = "EXPIRED";
    }

    return {
      status: order.status,
      code: order.code,
      fullText: order.code ? `Your ${order.service} code is ${order.code}` : null,
    };
  }

  /**
   * Demo/testing aid, not part of the SmsProvider contract — no real
   * provider can be told "deliver the code now". Skips the random 3-8s
   * wait so someone recording a walkthrough isn't stuck watching a spinner.
   * Idempotent: calling it on an order that already has a result just
   * returns that result unchanged.
   */
  async simulateReceipt(orderId: string): Promise<SmsResult> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new ProviderError(`Commande mock introuvable: ${orderId}.`, "ORDER_NOT_FOUND");
    }

    if (order.status === "PENDING") {
      clearTimeout(order.receiveTimer);
      order.status = "RECEIVED";
      order.code = randomDigits(6);
    }

    return {
      status: order.status,
      code: order.code,
      fullText: order.code ? `Your ${order.service} code is ${order.code}` : null,
    };
  }

  async cancelOrder(orderId: string): Promise<CancelResult> {
    await randomDelay(100, 300);

    const order = this.orders.get(orderId);
    if (!order) {
      throw new ProviderError(`Commande mock introuvable: ${orderId}.`, "ORDER_NOT_FOUND");
    }

    if (order.status !== "PENDING") {
      // Already received/cancelled/expired — nothing left to cancel.
      return { success: false, status: order.status };
    }

    clearTimeout(order.receiveTimer);
    order.status = "CANCELLED";

    return { success: true, status: order.status };
  }
}
