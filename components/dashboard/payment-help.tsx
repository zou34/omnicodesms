import { ChevronDown, CircleHelp } from "lucide-react";
import Link from "next/link";

// Mini-guide de paiement, replié par défaut dans la modale de recharge : sur
// mobile, il ne repousse pas les paliers, et le client qui hésite l'a sous
// les yeux au moment de payer. Contenu tiré des échecs réels observés
// (oct. 2026) : Wave ouvert depuis Facebook, paiements non validés à temps.
// <details> natif : accessible au clavier et lecteur d'écran, sans JavaScript.

const STEPS = [
  "Choisissez votre recharge ci-dessous, puis votre moyen de paiement sur la page sécurisée.",
  "Entrez le numéro lié à votre compte Wave, Orange Money, MTN MoMo ou Moov Money.",
  "Validez tout de suite sur votre téléphone : dans l'application Wave, ou avec votre code secret Mobile Money (notification ou SMS selon l'opérateur).",
  "Attendez le retour automatique sur FlashCodeSMS : votre solde se met à jour tout seul.",
] as const;

const TIPS = [
  { title: "Wave", text: "l'application Wave doit être installée. Depuis Facebook ou Instagram, ouvrez d'abord le site dans Chrome ou Safari." },
  { title: "Paiement refusé ?", text: "vérifiez votre solde Mobile Money et touchez « Réessayer » sur la page de paiement." },
  { title: "Aucun frais ajouté", text: "vous payez exactement le montant affiché." },
] as const;

export function PaymentHelp() {
  return (
    <details className="group mt-4 rounded-xl border border-slate-800 bg-slate-950/60 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium text-slate-200 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <CircleHelp className="h-4 w-4 shrink-0 text-blue-400" />
          Comment payer ? <span className="font-normal text-slate-500">Wave, Orange Money, MTN, Moov</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>

      <div className="border-t border-slate-800 px-4 pb-4 pt-3">
        <ol className="space-y-2">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-slate-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                {index + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <ul className="mt-4 space-y-1.5 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">
          {TIPS.map((tip) => (
            <li key={tip.title}>
              <span className="font-semibold text-slate-200">{tip.title} :</span> {tip.text}
            </li>
          ))}
          <li>
            <span className="font-semibold text-slate-200">Débité sans être crédité ?</span> Chaque paiement est
            revérifié automatiquement ; si votre solde n&apos;a pas bougé après quelques minutes,{" "}
            <Link href="/contact" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
              écrivez-nous
            </Link>
            .
          </li>
        </ul>
      </div>
    </details>
  );
}
