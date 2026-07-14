import { Check } from "lucide-react";

import { GlowingButton } from "@/components/ui/glowing-button";
import { formatFcfa, PACKS } from "@/lib/packs";

export function Pricing() {
  return (
    <section className="bg-slate-50 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Tarification Transparente
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Pas de frais cachés. Payez uniquement ce que vous utilisez.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-2xl bg-white ${
                pack.featured
                  ? "ring-2 ring-blue-600 shadow-xl lg:-translate-y-3"
                  : "shadow-sm ring-1 ring-slate-100"
              }`}
            >
              {pack.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  Plus populaire
                </span>
              )}

              <div
                className={`rounded-t-2xl px-6 pb-8 pt-8 text-white ${
                  pack.featured
                    ? "bg-gradient-to-br from-blue-700 to-blue-900"
                    : "bg-blue-600"
                }`}
              >
                {pack.discountTag && (
                  <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                    {pack.discountTag}
                  </span>
                )}
                <p className="mt-3 text-4xl font-extrabold">{pack.activations}</p>
                <p className="text-sm text-blue-100">activations</p>
              </div>

              <div className="flex flex-col gap-4 rounded-b-2xl px-6 pb-8 pt-6">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{formatFcfa(pack.priceFcfa)}</p>
                  <p className="mt-1 text-xs text-slate-500">{pack.perActivationLabel}</p>
                </div>

                {pack.perks && (
                  <ul className="space-y-2">
                    {pack.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 shrink-0 text-blue-600" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                )}

                <GlowingButton
                  href="/register"
                  fullWidth
                  className="mt-2 w-full py-3 text-sm font-bold text-white"
                  maskClassName={
                    pack.featured
                      ? "bg-blue-900 group-hover:bg-blue-800"
                      : "bg-slate-900 group-hover:bg-slate-800"
                  }
                >
                  Acheter
                </GlowingButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
