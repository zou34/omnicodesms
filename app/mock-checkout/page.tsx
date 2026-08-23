"use client";

import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// A fake hosted payment page standing in for a real aggregator's own
// checkout UI — only ever reached via a checkoutUrl that
// MockPaymentProvider.initializePayment() generated (see
// lib/payments/MockPaymentProvider.ts). Deliberately outside the app's own
// auth/layout: a real gateway's page wouldn't share our session either.
function MockCheckoutContent() {
  const searchParams = useSearchParams();
  const reference = searchParams?.get("reference") ?? null;
  const amount = searchParams?.get("amount") ?? null;
  const description = searchParams?.get("description") ?? null;
  const returnUrl = searchParams?.get("return_url") ?? null;
  const cancelUrl = searchParams?.get("cancel_url") ?? null;

  const [isProcessing, setIsProcessing] = useState<"success" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const missingParams = !reference || !returnUrl || !cancelUrl;

  async function simulate(outcome: "success" | "failed") {
    if (!reference || !returnUrl || !cancelUrl) return;

    setIsProcessing(outcome);
    setError(null);

    try {
      const response = await fetch("/api/mock-payment-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          status: outcome === "success" ? "SUCCESS" : "FAILED",
          amount: amount ? Number(amount) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Impossible de simuler ce paiement.");
        setIsProcessing(null);
        return;
      }

      window.location.href = outcome === "success" ? returnUrl : cancelUrl;
    } catch {
      setError("Une erreur réseau est survenue.");
      setIsProcessing(null);
    }
  }

  if (missingParams) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-lg font-bold text-white">Session de paiement invalide</h1>
        <p className="mt-2 text-sm text-slate-400">
          Cette page de test doit être atteinte via un lien généré par le checkout de
          l&apos;application, pas visitée directement.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
      <div className="flex items-center gap-2 text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Passerelle de paiement de test — aucun montant réel
        </span>
      </div>

      <h1 className="mt-4 text-xl font-bold text-white">Confirmer le paiement</h1>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}

      <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
        <span className="text-sm text-slate-400">Montant</span>
        <span className="text-lg font-semibold text-white">
          {amount ? `${Number(amount).toLocaleString("fr-FR")} FCFA` : "—"}
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-slate-600">Référence : {reference}</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => simulate("success")}
          disabled={isProcessing !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing === "success" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          Simuler un paiement réussi
        </button>

        <button
          type="button"
          onClick={() => simulate("failed")}
          disabled={isProcessing !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing === "failed" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          Simuler un échec de paiement
        </button>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Suspense fallback={null}>
        <MockCheckoutContent />
      </Suspense>
    </div>
  );
}
