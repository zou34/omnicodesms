import { CreditCard, Smartphone } from "lucide-react";

const METHODS = [
  { name: "Orange Money", accent: "bg-orange-500" },
  { name: "Wave", accent: "bg-sky-500" },
  { name: "MTN MoMo", accent: "bg-yellow-500" },
  { name: "Visa / Mastercard", accent: "bg-slate-700" },
] as const;

export function PaymentMethods() {
  return (
    <section className="bg-white px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Paiements Sécurisés
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Rechargez avec votre moyen de paiement préféré
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          Mobile money, cartes bancaires — choisissez le mode qui vous convient le mieux.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {METHODS.map(({ name, accent }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-3 rounded-2xl bg-slate-100 px-4 py-8 transition hover:bg-slate-200/70"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${accent} text-white`}>
                {name === "Visa / Mastercard" ? (
                  <CreditCard className="h-6 w-6" />
                ) : (
                  <Smartphone className="h-6 w-6" />
                )}
              </span>
              <span className="text-sm font-semibold text-slate-700">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
