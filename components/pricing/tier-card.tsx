import { Check, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { formatFcfa, type RechargeAmount, totalCreditFcfa } from "@/lib/packs";

interface TierCardProps {
  amount: RechargeAmount;
  /** "light" sur la page d'accueil, "dark" dans le dashboard. */
  theme: "light" | "dark";
  /** Bouton d'action (lien d'inscription ou déclencheur de paiement). */
  cta: ReactNode;
}

/**
 * Carte d'un palier de recharge — partagée par la page d'accueil
 * (components/landing/pricing.tsx) et le modal de recharge du dashboard, pour
 * que l'offre affichée soit toujours strictement la même.
 *
 * Prix d'ancrage : la valeur barrée n'apparaît que si le palier porte un
 * bonus réel (bonusFcfa > 0), et elle vaut exactement le crédit reçu.
 */
export function TierCard({ amount, theme, cta }: TierCardProps) {
  const dark = theme === "dark";
  const hasBonus = amount.bonusFcfa > 0;

  const frame = amount.featured
    ? dark
      ? "border-2 border-amber-400/80 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_40px_-6px_rgba(245,158,11,0.55)] lg:scale-[1.04]"
      : "border-2 border-amber-400 bg-white shadow-[0_0_44px_-8px_rgba(245,158,11,0.6)] lg:scale-[1.04]"
    : dark
      ? "border border-slate-800 bg-slate-950"
      : "border border-slate-200 bg-white shadow-sm";

  return (
    <div className={`relative flex h-full flex-col rounded-2xl p-6 transition ${frame} ${amount.featured ? "z-10" : ""}`}>
      {amount.featured && (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-lg shadow-amber-500/30">
          <Sparkles className="h-3 w-3" />
          Recommandé
        </span>
      )}

      <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>{amount.name}</h3>
      <p className={`mt-1 min-h-[2.5rem] text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>{amount.tagline}</p>

      <div className="mt-6 min-h-[5.5rem]">
        {hasBonus && (
          <p className={`text-sm font-medium line-through ${dark ? "text-slate-500" : "text-slate-400"}`}>
            Valeur {formatFcfa(totalCreditFcfa(amount))}
          </p>
        )}
        <p className={`text-4xl font-black tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
          {amount.priceFcfa.toLocaleString("fr-FR")}
          <span className={`ml-1 text-base font-bold ${dark ? "text-slate-400" : "text-slate-500"}`}>FCFA</span>
        </p>
        <p className={`mt-1 text-sm ${hasBonus ? "font-semibold text-emerald-500" : dark ? "text-slate-400" : "text-slate-500"}`}>
          {hasBonus
            ? `Vous recevez ${formatFcfa(totalCreditFcfa(amount))} de crédit`
            : `${formatFcfa(amount.priceFcfa)} de crédit`}
        </p>
      </div>

      <ul className="mt-6 flex-1 space-y-2.5">
        {amount.perks.map((perk) => (
          <li key={perk} className={`flex items-start gap-2 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${amount.featured ? "text-amber-500" : "text-blue-500"}`} />
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-6">{cta}</div>
    </div>
  );
}

/** Classes du bouton d'action d'une carte, selon qu'elle est mise en avant. */
export function tierCtaClassName(featured: boolean | undefined): string {
  return featured
    ? "btn-glow btn-glow-amber flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-bold text-amber-950 disabled:cursor-not-allowed disabled:opacity-60"
    : "btn-glow flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60";
}
