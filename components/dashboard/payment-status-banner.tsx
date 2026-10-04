"use client";

import { CheckCircle2, Clock, Loader2, X, XCircle } from "lucide-react";

import type { PaymentSyncState } from "@/components/dashboard/use-payment-sync";

// Retour d'une recharge SasPay, tel que suivi par usePaymentSync : le
// message ne parle de solde crédité qu'une fois le webhook réellement passé,
// jamais sur la seule foi de la redirection.
const MESSAGES: Record<Exclude<PaymentSyncState["phase"], "idle">, string> = {
  checking: "Paiement reçu — confirmation en cours, votre solde va se mettre à jour…",
  credited: "Recharge confirmée — votre solde est à jour.",
  delayed:
    "Votre opérateur n'a pas encore confirmé le paiement. Votre solde sera crédité automatiquement dès sa confirmation.",
  failed: "Le paiement n'a pas abouti — aucun montant n'a été crédité.",
  cancelled: "Paiement annulé — aucun montant n'a été débité.",
};

interface PaymentStatusBannerProps {
  state: PaymentSyncState;
  onDismiss: () => void;
}

export function PaymentStatusBanner({ state, onDismiss }: PaymentStatusBannerProps) {
  if (state.phase === "idle") return null;

  const tone =
    state.phase === "credited" || state.phase === "checking"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : state.phase === "delayed"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";

  const Icon =
    state.phase === "checking"
      ? Loader2
      : state.phase === "credited"
        ? CheckCircle2
        : state.phase === "delayed"
          ? Clock
          : XCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-auto mt-6 flex max-w-4xl items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${state.phase === "checking" ? "animate-spin" : ""}`} />

      <p className="flex-1">{MESSAGES[state.phase]}</p>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
