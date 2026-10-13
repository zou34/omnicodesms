import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { settleDeposit } from "@/lib/payments/settle-deposit";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Generous on purpose: real gateways retry aggressively on anything but a
// clean 200, so this only needs to catch an outright flood/DoS attempt, not
// normal retry traffic. Checked first, before signature/DB work, so a
// flood is cheap to reject.
const WEBHOOK_LIMIT = 100;

// La vérification peut interroger l'API SasPay (paiement en devise étrangère,
// référence absente de l'event) : marge explicite pour ne jamais être coupée
// avant d'avoir crédité — une coupure ferait relancer SasPay plus tard.
export const maxDuration = 30;
const WEBHOOK_WINDOW_MS = 60 * 1000;

// Confirms (or rejects) a payment initiated via /api/payments/checkout.
// This is the single most security-sensitive route in the app: it's the
// only thing standing between an unauthenticated internet endpoint and
// crediting real money to a user's balance.
//
// Answers 200 once the payload is understood, even when we can't act on it
// (unknown reference, amount mismatch, duplicate) — a retry of the same
// payload wouldn't change the outcome and would only add noise. The one
// exception is an internal failure (database unreachable): that answers 500
// on purpose, so the gateway retries once we're back up.
export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`webhook:${ip}`, WEBHOOK_LIMIT, WEBHOOK_WINDOW_MS);
  if (!limit.success) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  // Read the raw body BEFORE parsing: signature schemes are computed over
  // the exact bytes the gateway sent, and JSON.stringify(JSON.parse(body))
  // is not guaranteed to reproduce that byte-for-byte.
  const rawBody = await request.text();

  // Provider-agnostic from here: whichever gateway's signature scheme and
  // payload shape apply is entirely the active provider's (SasPay today,
  // real provider's) concern — this route only cares about the verified
  // event it hands back.
  let verification;
  try {
    verification = await getPaymentProvider().verifyWebhook(rawBody, request.headers);
  } catch (error) {
    // La vérification peut interroger l'API de la passerelle (rapprochement
    // d'un paiement en devise étrangère, référence absente de l'event) :
    // une panne passagère répond 500 pour que la passerelle relance.
    console.error("[POST /api/webhooks/payment] vérification impossible", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }

  if (!verification.valid) {
    if (verification.reason === "INVALID_SIGNATURE") {
      console.warn("[POST /api/webhooks/payment] rejected: invalid or missing signature");
      return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
    }
    if (verification.reason === "MALFORMED_BODY") {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }
    // Signed by someone who holds our secret, but not a shape we
    // recognize — log for investigation, still 200 so it isn't retried.
    console.error("[POST /api/webhooks/payment] unexpected payload shape", rawBody);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    // Règlement (crédit, bonus, promo, idempotence) : lib/payments/settle-deposit.ts,
    // partagé avec le rapprochement quotidien. Quelle que soit l'issue
    // (créditée, déjà réglée, référence inconnue, montant incohérent), la
    // réponse est 200 : relivrer le même événement n'y changerait rien.
    await settleDeposit(verification.event, "[POST /api/webhooks/payment]");
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/webhooks/payment]", error);
    // 500 pour que SasPay relance (+30 s, +5 min, +30 min, +2 h) : une panne
    // passagère de la base ne doit pas avaler un vrai paiement, car ce
    // webhook est le chemin principal qui crédite un solde. Les relances sont
    // sans risque — settleDeposit ne crédite jamais deux fois.
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
