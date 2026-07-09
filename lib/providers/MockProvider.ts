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

const DIAL_CODES: Record<string, string> = {
  US: "1",
  GB: "44",
  FR: "33",
  DE: "49",
  NG: "234",
  CI: "225",
  ID: "62",
  BR: "55",
};

const BASE_PRICE_BY_SERVICE: Record<string, number> = {
  whatsapp: 0.45,
  telegram: 0.25,
  google: 0.35,
  facebook: 0.3,
  instagram: 0.3,
  twitter: 0.28,
  discord: 0.22,
  tiktok: 0.32,
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
    return { amount: 1000, currency: "USD" };
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
    const price = Math.round(basePrice * jitter * 100) / 100;

    return {
      country,
      service,
      price,
      currency: "USD",
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
    const phoneNumber = `+${dialCode}${randomDigits(9)}`;
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
      currency: "USD",
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
