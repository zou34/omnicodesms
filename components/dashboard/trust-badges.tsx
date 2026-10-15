import { Clock, RefreshCcw, ShieldCheck } from "lucide-react";

// Points de réassurance sous les paliers de recharge : ce que le client
// obtient vraiment, au moment où il hésite à payer. Durée alignée sur la
// location réelle chez le fournisseur (20 min, lib/providers/GrizzlySmsProvider.ts).
const BADGES = [
  { icon: ShieldCheck, title: "Sécurité", text: "Numéro privé à usage unique." },
  { icon: Clock, title: "Temps garanti", text: "Valable jusqu'à 20 minutes." },
  { icon: RefreshCcw, title: "Zéro risque", text: "Remboursement automatique sur le solde si le SMS n'arrive pas." },
] as const;

export function TrustBadges() {
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
