"use client";

import { savePendingCheckout } from "@/components/dashboard/use-payment-sync";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/meta-pixel";
import { getRechargeAmountById } from "@/lib/packs";

export type CheckoutResult = { ok: true } | { ok: false; error: string; code?: string };

/**
 * Lance un paiement : crée la session côté serveur (app/api/payments/checkout,
 * montant résolu là-bas depuis lib/packs.ts, jamais depuis le client), mémorise
 * la recharge pour la suivre au retour (palier et code compris, pour pouvoir
 * la relancer en un clic après un échec), puis redirige vers SasPay.
 *
 * Partagé par la modale de recharge et le bouton « Réessayer le paiement » de
 * la bannière de retour. Ne résout qu'en cas d'échec : en cas de succès, le
 * navigateur quitte la page.
 */
export async function startCheckout(
  amountId: string,
  promoCode?: string,
  { track = true }: { track?: boolean } = {}
): Promise<CheckoutResult> {
  // Envoyé dès le clic, pas après la réponse : la redirection vers SasPay qui
  // suit couperait la requête du pixel encore en vol.
  const amount = getRechargeAmountById(amountId);
  if (amount && track) {
    trackMetaEvent("InitiateCheckout", {
      value: amount.priceFcfa,
      currency: META_PIXEL_CURRENCY,
      content_ids: [amount.id],
      content_type: "product",
      num_items: 1,
    });
  }

  let response: Response;
  try {
    response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountId, promoCode }),
    });
  } catch {
    return { ok: false, error: "Connexion impossible. Vérifiez votre réseau, puis réessayez." };
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.checkoutUrl) {
    return { ok: false, error: data?.error ?? "Impossible d'initier le paiement.", code: data?.code };
  }

  if (typeof data.reference === "string") savePendingCheckout(data.reference, { amountId, promoCode });
  window.location.href = data.checkoutUrl;
  return { ok: true };
}
