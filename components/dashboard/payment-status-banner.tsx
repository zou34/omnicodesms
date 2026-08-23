"use client";

import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Shown when the browser lands back on /dashboard after a gateway
// redirect (see the `return_url`/`cancel_url` set in
// app/api/payments/checkout/route.ts). The balance itself is only ever
// credited by app/api/webhooks/payment/route.ts, which may not have run
// yet by the time this page loads — so "success" here means "payment
// confirmed by the gateway's redirect", not "balance already updated".
// A single delayed refresh gives the webhook a moment to land before we
// re-fetch the server-rendered balance.
export function PaymentStatusBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Captured once at mount: the cleanup effect below rewrites the URL
  // (stripping `?payment=`), which makes `useSearchParams()` re-render
  // with an empty value — reading it live here would make the banner
  // vanish right after it appears.
  const [payment] = useState(() => searchParams?.get("payment") ?? null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (payment !== "success") return;

    const timer = setTimeout(() => router.refresh(), 2500);
    return () => clearTimeout(timer);
  }, [payment, router]);

  useEffect(() => {
    if (!payment) return;
    // Drop the query param so a manual page refresh doesn't re-show this.
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!payment || dismissed) return null;

  const isSuccess = payment === "success";

  return (
    <div
      className={`mx-auto mt-6 flex max-w-4xl items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {isSuccess ? (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}

      <p className="flex-1">
        {isSuccess ? (
          <>
            <CheckCircle2 className="mr-1 inline h-4 w-4 -translate-y-px" />
            Paiement confirmé — votre solde sera mis à jour automatiquement dans quelques
            secondes.
          </>
        ) : (
          "Paiement annulé — aucun montant n'a été débité."
        )}
      </p>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
