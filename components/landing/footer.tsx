const LINKS = [
  { label: "À Propos de Nous", accent: false },
  { label: "Comment Ça Marche", accent: false },
  { label: "Nous Contacter", accent: false },
  { label: "Conditions d'Utilisation", accent: false },
  { label: "Politique de Confidentialité", accent: false },
  { label: "API", accent: true },
] as const;

export function Footer() {
  return (
    <footer className="bg-slate-950 px-6 py-16 pb-28 text-white sm:px-10 sm:pb-16">
      <div className="mx-auto max-w-3xl text-center">
        <h3 className="text-2xl font-bold tracking-tight">OmniCodeSMS</h3>
        <p className="mt-2 text-sm text-slate-400">
          Numéros Virtuels pour Vérification SMS
        </p>

        <nav className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          {LINKS.map(({ label, accent }) => (
            <a
              key={label}
              href="#"
              className={`transition hover:text-white ${
                accent ? "font-semibold text-emerald-400" : "text-slate-400"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#"
          className="mt-10 inline-block rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Nous Contacter
        </a>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">
          © 2026 OmniCodeSMS. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
