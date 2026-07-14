import { ArrowRight } from "lucide-react";

import { GlowingButton } from "@/components/ui/glowing-button";

export function FinalCta() {
  return (
    <section className="bg-gradient-to-b from-sky-400 via-blue-600 to-blue-900 px-6 py-24 text-center text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Prêt à Commencer ?</h2>

        <p className="mt-5 text-base text-blue-50 sm:text-lg">
          La solution de vérification SMS la plus rapide d&apos;Afrique
        </p>

        <GlowingButton
          href="/register"
          className="mt-10 px-8 py-4 text-base font-bold text-blue-900 shadow-xl shadow-blue-950/30"
          maskClassName="bg-white group-hover:bg-blue-50"
        >
          Créer un Compte Gratuit
          <ArrowRight className="h-5 w-5" />
        </GlowingButton>
      </div>
    </section>
  );
}
