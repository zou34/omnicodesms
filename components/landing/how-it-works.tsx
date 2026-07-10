import { CreditCard, Globe, MessageSquare } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Globe,
    title: "Choisir le Service",
    description: "Sélectionnez le pays et le service pour lequel vous avez besoin d'un numéro.",
  },
  {
    number: "02",
    icon: CreditCard,
    title: "Obtenir un Numéro",
    description: "Votre numéro virtuel est réservé instantanément et débité de votre solde.",
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Recevoir le SMS",
    description: "Le code de vérification arrive directement dans votre tableau de bord.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="bg-slate-50 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          3 étapes simples pour recevoir votre SMS
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map(({ number, icon: Icon, title, description }) => (
            <div
              key={number}
              className="relative isolate overflow-hidden rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-8 -z-10 select-none text-8xl font-black text-slate-100"
              >
                {number}
              </span>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="mt-6 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
