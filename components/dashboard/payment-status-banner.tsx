"use client";

import { CheckCircle2, Clock, Loader2, RotateCcw, X, XCircle } from "lucide-react";

import type { PaymentSyncState, RetryInfo } from "@/components/dashboard/use-payment-sync";
import { formatFcfa, getRechargeAmountById } from "@/lib/packs";

// Retour d'une recharge SasPay, tel que suivi par usePaymentSync : le message
// ne parle de solde crédité qu'une fois le webhook réellement passé, jamais
// sur la seule foi de la redirection.
//
// Après un échec, une annulation ou un paiement non finalisé, le client doit
// savoir quoi faire et pouvoir relancer tout de suite : bouton « Réessayer »
// bien visible, qui relance la même recharge sans repasser par la modale.

type Phase = Exclude<PaymentSyncState["phase"], "idle">;

const CONTENT: Record<Phase, { title: string; body?: string }> = {
  checking: { title: "Paiement reçu — confirmation en cours, votre solde va se mettre à jour…" },
  credited: { title: "Recharge confirmée — votre solde est à jour." },
  delayed: {
    title: "Votre opérateur n'a pas encore confirmé le paiement.",
    body: "Votre solde sera crédité automatiquement dès sa confirmation. Inutile de payer une seconde fois.",
  },
  failed: {
    title: "Le paiement a échoué.",
    body: "Veuillez vérifier votre solde ou votre réseau, puis réessayez. Aucun montant n'a été débité.",
  },
  cancelled: {
    title: "Paiement annulé.",
    body: "Aucun montant n'a été débité. Vous pouvez relancer votre recharge quand vous voulez.",
  },
  unfinished: {
    title: "Votre paiement n'a pas été finalisé.",
    body: "Si vous l'avez déjà validé sur votre téléphone, patientez : votre solde se mettra à jour tout seul. Sinon, relancez-le.",
  },
};

const TONES: Record<Phase, string> = {
  checking: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  credited: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  delayed: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  unfinished: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  failed: "border-red-500/40 bg-red-500/10 text-red-300",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-300",
};

interface PaymentStatusBannerProps {
  state: PaymentSyncState;
  onDismiss: () => void;
  /** Relance la même recharge (palier et code mémorisés). */
  onRetry: (retry: RetryInfo) => void;
  /** Ouvre la modale de recharge, pour changer de montant. */
  onChooseAmount: () => void;
  isRetrying: boolean;
  retryError: string | null;
}

export function PaymentStatusBanner({
  state,
  onDismiss,
  onRetry,
  onChooseAmount,
  isRetrying,
  retryError,
}: PaymentStatusBannerProps) {
  if (state.phase === "idle") return null;

  const { title, body } = CONTENT[state.phase];
  const retry = "retry" in state ? state.retry : null;
  const amount = retry?.amountId ? getRechargeAmountById(retry.amountId) : undefined;

  const Icon =
    state.phase === "checking"
      ? Loader2
      : state.phase === "credited"
        ? CheckCircle2
        : state.phase === "delayed" || state.phase === "unfinished"
          ? Clock
          : XCircle;

  return (
    <div
      role={retry ? "alert" : "status"}
      aria-live="polite"
      className={`mx-4 mt-6 max-w-4xl rounded-xl border px-4 py-3 text-sm sm:mx-auto ${TONES[state.phase]}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${state.phase === "checking" ? "animate-spin" : ""}`} />
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          {body && <p className="mt-1 leading-relaxed opacity-90">{body}</p>}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {retry && (
        <div className="mt-3 flex flex-col gap-2 pl-8 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => (retry.amountId ? onRetry(retry) : onChooseAmount())}
            disabled={isRetrying}
            className="btn-glow flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {isRetrying
              ? "Redirection vers le paiement…"
              : amount
                ? `Réessayer le paiement (${formatFcfa(amount.priceFcfa)})`
                : "Réessayer le paiement"}
          </button>
          {retry.amountId && (
            <button
              type="button"
              onClick={onChooseAmount}
              disabled={isRetrying}
              className="text-xs font-medium text-slate-300 underline underline-offset-2 hover:text-white disabled:opacity-60"
            >
              Choisir un autre montant
            </button>
          )}
        </div>
      )}

      {retryError && <p className="mt-2 pl-8 text-xs text-red-300">{retryError}</p>}
    </div>
  );
}
