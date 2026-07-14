import { Check } from "lucide-react";

import { GlowingButton } from "@/components/ui/glowing-button";

interface PricingPlan {
  activations: number;
  price: number;
  perActivation: string;
  discountTag?: string;
  featured?: boolean;
  perks?: string[];
}

const PLANS: PricingPlan[] = [
  { activations: 10, price: 1000, perActivation: "100 FCFA/activation" },
  { activations: 32, price: 3000, perActivation: "94 FCFA/activation", discountTag: "-7%" },
  { activations: 55, price: 5000, perActivation: "91 FCFA/activation", discountTag: "-10%" },
  {
    activations: 175,
    price: 15000,
    perActivation: "86 FCFA/activation",
    discountTag: "-17%",
    featured: true,
    perks: ["Livraison instantanée", "Sans expiration", "Support 24/7"],
  },
];

const formatFcfa = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

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
          {PLANS.map((plan) => (
            <div
              key={plan.activations}
              className={`relative rounded-2xl bg-white ${
                plan.featured
                  ? "ring-2 ring-blue-600 shadow-xl lg:-translate-y-3"
                  : "shadow-sm ring-1 ring-slate-100"
              }`}
            >
              {plan.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  Plus populaire
                </span>
              )}

              <div
                className={`rounded-t-2xl px-6 pb-8 pt-8 text-white ${
                  plan.featured
                    ? "bg-gradient-to-br from-blue-700 to-blue-900"
                    : "bg-blue-600"
                }`}
              >
                {plan.discountTag && (
                  <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                    {plan.discountTag}
                  </span>
                )}
                <p className="mt-3 text-4xl font-extrabold">{plan.activations}</p>
                <p className="text-sm text-blue-100">activations</p>
              </div>

              <div className="flex flex-col gap-4 rounded-b-2xl px-6 pb-8 pt-6">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{formatFcfa(plan.price)}</p>
                  <p className="mt-1 text-xs text-slate-500">{plan.perActivation}</p>
                </div>

                {plan.perks && (
                  <ul className="space-y-2">
                    {plan.perks.map((perk) => (
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
                    plan.featured
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
