import { Check } from "lucide-react";
import Link from "next/link";

import { ReferralCodeCard } from "@/components/landing/referral-code-card";

const PERKS = ["Bonus à chaque recharge", "Parrainage illimité", "Crédit instantané"] as const;

export function ReferralSection() {
  return (
    <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 px-6 py-24 text-white sm:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Parrainez vos Amis, Gagnez des Bonus
          </h2>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-blue-100 sm:text-lg">
            Quand votre filleul recharge, vous gagnez 5$ et il gagne 5$. Tout le monde y gagne !
          </p>

          <ul className="mt-8 space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm sm:text-base">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-blue-900 shadow-xl shadow-blue-950/30 transition hover:bg-blue-50"
          >
            S&apos;inscrire avec un Code Parrain
          </Link>
        </div>

        <ReferralCodeCard />
      </div>
    </section>
  );
}
