import { Globe, ShieldCheck, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Vitesse Éclair",
    description: "Recevez vos codes de vérification instantanément, sans temps d'attente.",
  },
  {
    icon: Globe,
    title: "Couverture Mondiale",
    description: "Des numéros disponibles dans plus de 100 pays, pour les applications du monde entier.",
  },
  {
    icon: ShieldCheck,
    title: "Confidentialité Préservée",
    description: "Gardez votre numéro personnel pour vous : utilisez un numéro dédié pour vos vérifications.",
  },
] as const;
// Libellés relus pour la modération publicitaire de Meta, qui examine aussi
// la page d'arrivée : pas de « contourner », d'« anonymat » ni de promesse
// de restrictions évitées (règle « Contournement des systèmes »).

export function WhyChooseUs() {
  return (
    <section className="bg-white px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center">
          <span aria-hidden className="mb-5 h-2.5 w-2.5 rounded-sm bg-blue-500" />

          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Pourquoi Choisir FlashCodeSMS ?
          </h2>

          <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            La plateforme la plus avancée pour sécuriser vos inscriptions en ligne. Une
            expérience repensée, rigoureuse et sans limites.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-8 transition hover:border-blue-100 hover:bg-blue-50/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
