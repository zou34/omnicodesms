"use client";

import { CheckCircle2, Loader2, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { formatFcfa, PACKS } from "@/lib/packs";

interface RechargeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newBalanceFcfa: number) => void;
}

export function RechargeModal({ open, onClose, onSuccess }: RechargeModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>(PACKS[0]?.id ?? "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);

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

  // Simulates the payment step today; swap the body of this handler for a
  // real Stripe/Flutterwave call later — see the TODO in
  // app/api/wallet/recharge/route.ts for exactly what changes.
  async function handleRecharge() {
    if (!selectedPack) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/wallet/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: selectedPack.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Impossible de traiter la recharge.");
        return;
      }

      setSuccessAmount(selectedPack.priceFcfa);
      onSuccess(Number(data.balance));
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleClose() {
    setError(null);
    setSuccessAmount(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"
      >
        {successAmount !== null ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <p className="text-lg font-bold text-white">Recharge réussie !</p>
            <p className="text-sm text-slate-400">
              {formatFcfa(successAmount)} ont été ajoutés à votre solde.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
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
              disabled={!selectedPack || isProcessing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isProcessing
                ? "Traitement du paiement..."
                : selectedPack
                  ? `Confirmer l'achat — ${formatFcfa(selectedPack.priceFcfa)}`
                  : "Sélectionnez un pack"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Paiement simulé — Stripe et Flutterwave seront bientôt disponibles.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
