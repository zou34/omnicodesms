import { ShieldCheck } from "lucide-react";

function TerminalMockup() {
  return (
    <div className="overflow-hidden rounded-xl bg-slate-950 shadow-inner">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
      </div>
      <div className="space-y-1 px-4 py-3 font-mono text-[11px] leading-relaxed">
        <p className="text-emerald-400">$ omnicodesms connect --fast</p>
        <p className="text-emerald-500/70">✓ Numéro attribué en 2.4s</p>
      </div>
    </div>
  );
}

function WorldwideMockup() {
  return (
    <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.15)_1px,transparent_0)] bg-[length:14px_14px]"
      />
      <span className="relative text-5xl font-black text-slate-200">170+</span>
    </div>
  );
}

function PriceReceiptMockup() {
  return (
    <div className="flex h-24 items-center justify-center">
      <div className="w-32 rounded-lg bg-white p-3 text-center shadow-md ring-1 ring-slate-100">
        <p className="text-[10px] text-slate-400">Numéro US</p>
        <p className="text-xs text-slate-400 line-through">0.89 $</p>
        <p className="border-t border-dashed border-slate-200 pt-1 text-lg font-extrabold text-emerald-600">
          0.50 $
        </p>
      </div>
    </div>
  );
}

function EncryptionMockup() {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-2">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute h-16 w-16 rounded-full border border-blue-100" />
        <span className="absolute h-11 w-11 rounded-full border border-blue-200" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>
      <span className="text-[10px] font-semibold tracking-widest text-blue-500">AES-256</span>
    </div>
  );
}

function DashboardWireframeMockup() {
  return (
    <div className="grid h-24 grid-cols-4 gap-1.5 rounded-xl bg-slate-50 p-3">
      <div className="col-span-1 space-y-1.5">
        <div className="h-2 w-full rounded bg-slate-300" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-2/3 rounded bg-slate-200" />
      </div>
      <div className="col-span-3 space-y-1.5">
        <div className="h-6 w-full rounded bg-blue-200" />
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-9 rounded bg-slate-200" />
          <div className="h-9 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function SupportGaugeMockup() {
  return (
    <div className="flex h-24 items-center justify-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[conic-gradient(#2563eb_0%_99%,#e2e8f0_99%_100%)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">
          99%
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: "Activation Instantanée",
    description: "Recevez votre numéro virtuel en moins de 3 secondes.",
    Mockup: TerminalMockup,
  },
  {
    title: "Couverture Mondiale",
    description: "Plus de 170 pays et services disponibles.",
    Mockup: WorldwideMockup,
  },
  {
    title: "Prix Abordables",
    description: "À partir de 0.50$ seulement.",
    Mockup: PriceReceiptMockup,
  },
  {
    title: "Sécurisé et Privé",
    description: "Chiffrement des données. Confidentialité totale.",
    Mockup: EncryptionMockup,
  },
  {
    title: "Interface Intuitive",
    description: "Dashboard moderne en un clic.",
    Mockup: DashboardWireframeMockup,
  },
  {
    title: "Support 24/7",
    description: "Équipe disponible à tout moment.",
    Mockup: SupportGaugeMockup,
  },
] as const;

export function FeaturesGrid() {
  return (
    <section className="bg-white px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Fonctionnalités
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Tout ce dont vous avez besoin
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, description, Mockup }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <Mockup />
              <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
