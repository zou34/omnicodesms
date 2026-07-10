const LINKS = ["Termes", "Confidentialité", "Contact"] as const;

export function Footer() {
  return (
    <footer className="bg-slate-950 px-6 py-12 pb-28 text-slate-400 sm:px-10 sm:pb-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <span className="text-lg font-bold tracking-tight text-white">OmniCodeSMS</span>

        <nav className="flex items-center gap-6">
          {LINKS.map((link) => (
            <a key={link} href="#" className="text-sm transition hover:text-white">
              {link}
            </a>
          ))}
        </nav>

        <p className="text-sm">© 2026 OmniCodeSMS. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
