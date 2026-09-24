import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { BASE_URL, getGrizzlyApiKey } from "@/lib/providers/GrizzlySmsProvider";

export const dynamic = "force-dynamic";

// Diagnostic réservé aux admins : montre la réponse BRUTE de GrizzlySMS telle
// que la voit le serveur de production (clé, blocage d'IP, pare-feu...).
// Aucun achat : uniquement getBalance et getPrices.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const rawEnv = process.env.GRIZZLY_API_KEY ?? "";
  const key = getGrizzlyApiKey();
  const report: Record<string, unknown> = {
    smsProviderEnv: process.env.SMS_PROVIDER ?? null,
    region: process.env.VERCEL_REGION ?? null,
    keyPresent: Boolean(key),
    keyLength: key?.length ?? 0,
    rawKeyNeededCleanup: rawEnv !== key,
  };

  for (const params of [
    { action: "getBalance" },
    { action: "getPrices", service: "tw", country: "10" },
  ]) {
    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", key ?? "");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const body = await response.text();
      report[params.action] = { status: response.status, body: body.slice(0, 300) };
    } catch (error) {
      report[params.action] = { networkError: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
    }
  }

  return NextResponse.json(report);
}
