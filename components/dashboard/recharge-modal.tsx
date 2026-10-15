"use client";

import { Loader2, ShieldCheck, Tag, X, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OpenInBrowserHint } from "@/components/dashboard/open-in-browser-hint";
import { PaymentHelp } from "@/components/dashboard/payment-help";
import { PriceExamples } from "@/components/dashboard/price-examples";
import { startCheckout } from "@/components/dashboard/start-checkout";
import { TrustBadges } from "@/components/dashboard/trust-badges";
import { TierCard, TierCta } from "@/components/pricing/tier-card";
import { Toast, type ToastState } from "@/components/ui/toast";
import { formatFcfa, RECHARGE_AMOUNTS } from "@/lib/packs";
import type { PriceExample } from "@/lib/price-examples";
import { computePromoBonus, normalizePromoCode, type PromoRules } from "@/lib/promo-rules";

interface RechargeModalProps {
  open: boolean;
  onClose: () => void;
  /** Palier choisi sur la page d'accueil, mis en avant et placé en tête. */
  highlightedAmountId?: string | null;
  /** Navigateur intégré d'une appli : on recommande d'ouvrir le site ailleurs pour Wave. */
  inAppBrowser?: boolean;
  /**
   * Code de l'offre en cours, déjà validé côté serveur pour CE client (actif,
   * non expiré, jamais utilisé par lui) : appliqué d'office, pour que le
   * bonus s'affiche sur chaque palier sans que le client ait à le chercher.
   */
  featuredPromo?: FeaturedPromo | null;
  /** Exemples de prix réels, affichés au-dessus des paliers. */
  priceExamples?: PriceExample[];
}

interface AppliedPromo extends PromoRules {
  code: string;
  label: string;
  /** Date de fin lisible (« 31 octobre »), pour l'offre mise en avant. */
  expiresLabel?: string | null;
}

export type FeaturedPromo = AppliedPromo;

export function RechargeModal({
  open,
  onClose,
  highlightedAmountId = null,
  inAppBrowser = false,
  featuredPromo = null,
  priceExamples = [],
}: RechargeModalProps) {
  // Sur mobile les cartes s'empilent (~450 px chacune) : celle qui compte —
  // le palier choisi, à défaut le palier recommandé — passe en tête au lieu
  // d'attendre deux écrans plus bas. Ordre d'origine dès 2 colonnes.
  const leadAmountId =
    highlightedAmountId ?? RECHARGE_AMOUNTS.find((amount) => amount.featured)?.id ?? null;

  const [payingAmountId, setPayingAmountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(featuredPromo);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleApplyPromo(event: React.FormEvent) {
    event.preventDefault();
    const code = normalizePromoCode(promoInput);
    if (!code) return;

    setIsCheckingPromo(true);
    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        setAppliedPromo(null);
        setToast({ type: "error", message: data?.error ?? "Impossible de vérifier ce code." });
        return;
      }

      setAppliedPromo(data as AppliedPromo);
      setToast({ type: "success", message: `Code ${data.code} appliqué : ${data.label} !` });
    } catch {
      setToast({ type: "error", message: "Une erreur réseau est survenue." });
    } finally {
      setIsCheckingPromo(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
  }

  // Lance le paiement (components/dashboard/start-checkout.ts) : session créée
  // côté serveur, recharge mémorisée pour le suivi au retour, redirection vers
  // SasPay. Le solde et les bonus sont crédités plus tard, à la confirmation.
  async function handleRecharge(amountId: string, promoCode: string | undefined = appliedPromo?.code, isRetry = false) {
    setPayingAmountId(amountId);
    setError(null);

    const result = await startCheckout(amountId, promoCode, { track: !isRetry });
    if (result.ok) return;

    // Code appliqué d'office (featuredPromo) devenu invalide entre-temps —
    // typiquement déjà utilisé par ce client lors d'une recharge faite sans
    // recharger la page. Le client n'a rien saisi : on ne bloque pas son
    // paiement pour ça, on le relance sans code et on le lui dit.
    if (result.code === "INVALID_PROMO" && promoCode && promoCode === featuredPromo?.code && !isRetry) {
      setAppliedPromo(null);
      setToast({ type: "error", message: `${result.error} Recharge sans le bonus du code.` });
      return handleRecharge(amountId, undefined, true);
    }

    if (result.code === "INVALID_PROMO") setAppliedPromo(null);
    setError(result.error);
    setPayingAmountId(null);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    // `items-start` + `overflow-y-auto` + `my-auto` sur la boîte : la modale
    // reste centrée quand elle tient dans l'écran, et devient scrollable au
    // lieu d'être rognée en haut sur les petits écrans de téléphone.
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/75 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recharge-title"
        onClick={(event) => event.stopPropagation()}
        className="my-auto w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h2 id="recharge-title" className="text-lg font-bold text-white sm:text-xl">
                Recharger mon solde
              </h2>
              <p className="text-sm text-slate-400">Plus vous rechargez, plus on vous offre de crédit.</p>
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

        {inAppBrowser && <OpenInBrowserHint packId={highlightedAmountId} />}

        {/* Code promo : vérifié ici pour l'aperçu, revérifié au paiement. */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          {appliedPromo ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-emerald-400">
                <Tag className="h-4 w-4 shrink-0" />
                <span>
                  Code <span className="font-mono font-bold">{appliedPromo.code}</span> appliqué — {appliedPromo.label}
                </span>
                {appliedPromo.expiresLabel && (
                  <span className="basis-full pl-6 text-xs text-emerald-300/80">
                    Offre valable jusqu&apos;au {appliedPromo.expiresLabel}
                  </span>
                )}
              </p>
              <button type="button" onClick={removePromo} className="text-xs text-slate-400 underline hover:text-white">
                Retirer
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyPromo} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="promo-code" className="sr-only">
                Code promo
              </label>
              <input
                id="promo-code"
                type="text"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                placeholder="Vous avez un code promo ?"
                autoComplete="off"
                maxLength={32}
                className="field-glow flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 font-mono text-base uppercase sm:text-sm text-white outline-none placeholder:font-sans placeholder:normal-case placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!promoInput.trim() || isCheckingPromo}
                className="btn-glow flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCheckingPromo && <Loader2 className="h-4 w-4 animate-spin" />}
                Appliquer
              </button>
            </form>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <PaymentHelp />

        <PriceExamples examples={priceExamples} />

        {/* pt-4 : place pour le badge "Recommandé" qui déborde de sa carte. */}
        <div className="mt-6 grid grid-cols-1 items-stretch gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {RECHARGE_AMOUNTS.map((amount) => {
            const isPaying = payingAmountId === amount.id;
            const promoApplies = appliedPromo && amount.priceFcfa >= appliedPromo.minRechargeFcfa;
            const promoBonus = promoApplies ? computePromoBonus(appliedPromo, amount.priceFcfa) : 0;

            return (
              <TierCard
                key={amount.id}
                amount={amount}
                theme="dark"
                selected={amount.id === highlightedAmountId}
                className={amount.id === leadAmountId ? "order-first sm:order-none" : ""}
                cta={
                  <div className="space-y-2">
                    {appliedPromo && (
                      <p className={`text-center text-xs ${promoBonus > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                        {promoBonus > 0
                          ? `+ ${formatFcfa(promoBonus)} avec votre code`
                          : `Code valable dès ${formatFcfa(appliedPromo.minRechargeFcfa)}`}
                      </p>
                    )}
                    <TierCta
                      featured={amount.featured}
                      onClick={() => handleRecharge(amount.id)}
                      disabled={payingAmountId !== null}
                    >
                      {isPaying && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isPaying ? "Redirection..." : `Recharger ${formatFcfa(amount.priceFcfa)}`}
                    </TierCta>
                  </div>
                }
              />
            );
          })}
        </div>

        <TrustBadges />

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Paiement Mobile Money sécurisé par notre partenaire. Crédit versé dès la confirmation du paiement.
        </p>
      </div>

      {/* Isolé du fond cliquable : fermer le toast ne doit pas fermer le modal. */}
      <div onClick={(event) => event.stopPropagation()}>
        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
