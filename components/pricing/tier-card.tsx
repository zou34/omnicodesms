import { Check, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { GlowingButton } from "@/components/ui/glowing-button";

import { formatFcfa, type RechargeAmount, totalCreditFcfa } from "@/lib/packs";

interface TierCardProps {
  amount: RechargeAmount;
  /** "light" sur la page d'accueil, "dark" dans le dashboard. */
  theme: "light" | "dark";
  /** Bouton d'action (lien d'inscription ou déclencheur de paiement). */
  cta: ReactNode;
  /** Classes ajoutées au cadre (ordre dans la grille, anneau de sélection). */
  className?: string;
  /** Pastille « Votre sélection » : palier choisi sur la page d'accueil. */
  selected?: boolean;
}

/**
 * Carte d'un palier de recharge — partagée par la page d'accueil
 * (components/landing/pricing.tsx) et le modal de recharge du dashboard, pour
 * que l'offre affichée soit toujours strictement la même.
 *
 * Prix d'ancrage : la valeur barrée n'apparaît que si le palier porte un
 * bonus réel (bonusFcfa > 0), et elle vaut exactement le crédit reçu.
 */
export function TierCard({ amount, theme, cta, className = "", selected = false }: TierCardProps) {
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
    <div
      className={`relative flex h-full flex-col rounded-2xl p-6 transition ${frame} ${amount.featured ? "z-10" : ""} ${
        selected ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900" : ""
      } ${className}`}
    >
      {selected ? (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-blue-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-500/30">
          <Check className="h-3 w-3" />
          Votre sélection
        </span>
      ) : amount.featured && (
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

interface TierCtaProps {
  featured?: boolean;
  children: ReactNode;
  /** Lien (page d'accueil) ou action (paiement dans le dashboard). */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Bouton "Recharger" d'une carte : même anneau néon animé que le CTA principal
 * de la page d'accueil (GlowingButton), ambré sur le palier mis en avant, et
 * halo atténué pour que quatre boutons côte à côte restent élégants.
 */
export function TierCta({ featured, children, href, onClick, disabled }: TierCtaProps) {
  const className = `w-full py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
    featured ? "text-amber-950" : "text-white"
  }`;
  const maskClassName = featured
    ? "bg-gradient-to-r from-amber-400 to-orange-500 group-hover:from-amber-300 group-hover:to-orange-400"
    : "bg-blue-600 group-hover:bg-blue-500";
  const tone = featured ? "amber" : "blue";

  return href ? (
    <GlowingButton href={href} fullWidth subtle tone={tone} className={className} maskClassName={maskClassName}>
      {children}
    </GlowingButton>
  ) : (
    <GlowingButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      fullWidth
      subtle
      tone={tone}
      className={className}
      maskClassName={maskClassName}
    >
      {children}
    </GlowingButton>
  );
}
