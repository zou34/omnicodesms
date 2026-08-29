"use client";

import { Loader2, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { formatFcfa, PACKS } from "@/lib/packs";

interface RechargeModalProps {
  open: boolean;
  onClose: () => void;
}

export function RechargeModal({ open, onClose }: RechargeModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>(PACKS[0]?.id ?? "");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectedPack = PACKS.find((pack) => pack.id === selectedPackId);

  // Initiates a real checkout session server-side (see
  // app/api/payments/checkout/route.ts) and redirects the browser to the
  // gateway's hosted payment page. The balance is credited later by
  // app/api/webhooks/payment/route.ts once the gateway confirms payment —
  // never here, and never based on anything the client reports.
  async function handleRecharge() {
    if (!selectedPack) return;

    setIsRedirecting(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: selectedPack.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Impossible d'initier le paiement.");
        setIsRedirecting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Une erreur réseau est survenue.");
      setIsRedirecting(false);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    // `items-start` + `overflow-y-auto` + `my-auto` sur la boîte : la modale
    // reste centrée quand elle tient dans l'écran, et devient scrollable au
    // lieu d'être rognée en haut (titre + bouton de fermeture inaccessibles)
    // sur les petits écrans de téléphone.
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="my-auto w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Recharger mon solde</h2>
              <p className="text-sm text-slate-400">Choisissez un pack d&apos;activations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PACKS.map((pack) => {
            const isSelected = pack.id === selectedPackId;

            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPackId(pack.id)}
                className={`relative rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500"
                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                }`}
              >
                {pack.discountTag && (
                  <span className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    {pack.discountTag}
                  </span>
                )}
                <p className="text-xl font-extrabold text-white">{pack.activations}</p>
                <p className="text-xs text-slate-400">activations</p>
                <p className="mt-2 text-base font-bold text-white">{formatFcfa(pack.priceFcfa)}</p>
                <p className="text-xs text-slate-500">{pack.perActivationLabel}</p>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleRecharge}
          disabled={!selectedPack || isRedirecting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRedirecting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isRedirecting
            ? "Redirection vers le paiement..."
            : selectedPack
              ? `Procéder au paiement — ${formatFcfa(selectedPack.priceFcfa)}`
              : "Sélectionnez un pack"}
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          Paiement sécurisé — vous allez être redirigé vers notre partenaire de paiement.
        </p>
      </div>
    </div>
  );
}
