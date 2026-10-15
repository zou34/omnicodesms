import { formatFcfa } from "@/lib/packs";
import { EXAMPLE_BUDGET_FCFA, type PriceExample } from "@/lib/price-examples";

// Encart « Ce que vous pouvez obtenir avec 1 000 FCFA », au-dessus des
// paliers de la modale de recharge. Les prix viennent du catalogue réel
// (lib/price-examples.ts) : ils restent exacts après chaque synchro.
export function PriceExamples({ examples }: { examples: PriceExample[] }) {
  if (examples.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-sm font-semibold text-white">
          Ce que vous pouvez obtenir avec une recharge de {formatFcfa(EXAMPLE_BUDGET_FCFA)} :
        </p>
        <ul className="mt-3 space-y-2.5">
          {examples.map((example) => (
            <li key={example.slug} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 text-slate-200">
                <span aria-hidden className="mr-1.5">
                  {example.emoji}
                </span>
                <span className="font-medium">{example.label}</span>{" "}
                <span className="text-slate-400">({example.countryName})</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-semibold text-white">~{formatFcfa(example.priceFcfa)} / numéro</span>
                <span className="block text-xs text-emerald-400">
                  soit {example.validations} validation{example.validations > 1 ? "s" : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 px-1 text-[11px] italic leading-snug text-slate-400/70">
        Note : Les tarifs varient fortement selon le pays choisi et la disponibilité chez les opérateurs locaux.
        Certains pays très demandés ont un coût plus élevé. Le prix exact de chaque pays est toujours affiché en
        toute transparence avant de générer votre numéro.
      </p>
    </div>
  );
}
