import { Clock, RefreshCcw, ShieldCheck } from "lucide-react";

// Points de réassurance de la modale de recharge : ce que le client obtient
// vraiment, au moment où il hésite à payer. Durée alignée sur la location
// réelle chez le fournisseur (20 min, lib/providers/GrizzlySmsProvider.ts).
//
// Deux présentations :
//  - "full" : bloc détaillé sous la grille des paliers ;
//  - "compact" : une ligne sous CHAQUE bouton « Recharger », sous lg. Sur
//    mobile les paliers s'empilent (~450 px chacun) : le bloc du bas arrive
//    après ~2 000 px de défilement et passe inaperçu au moment du clic.
const BADGES = [
  { icon: ShieldCheck, title: "Sécurité", text: "Numéro privé à usage unique.", short: "Numéro privé" },
  { icon: Clock, title: "Temps garanti", text: "Valable jusqu'à 20 minutes.", short: "Valable 20 min" },
  {
    icon: RefreshCcw,
    title: "Zéro risque",
    text: "Remboursement automatique sur le solde si le SMS n'arrive pas.",
    short: "Remboursé si pas de SMS",
  },
] as const;

export function TrustBadges({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400 lg:hidden">
        {BADGES.map(({ icon: Icon, short }) => (
          <li key={short} className="flex items-center gap-1">
            <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            {short}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mx-auto mt-6 flex w-fit max-w-full flex-col items-start gap-2 text-sm text-slate-400 lg:w-auto lg:flex-row lg:justify-center lg:gap-6">
      {BADGES.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-2 text-left">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            <span className="font-semibold text-slate-200">{title} :</span> {text}
          </span>
        </li>
      ))}
    </ul>
  );
}
