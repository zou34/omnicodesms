"use client";

import { PlusCircle, Wallet, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface WelcomeModalProps {
  onRecharge: () => void;
}

// Accueil d'un nouveau compte, affiché une seule fois à son arrivée sur le
// dashboard : après une inscription par e-mail (app/register/register-form.tsx)
// ou une première connexion Google (pages.newUser dans lib/auth.ts), qui
// redirigent tous deux vers /dashboard?welcome=1. Un compte neuf a toujours un
// solde de 0 : on l'invite à recharger avant de tenter une location.
export function WelcomeModal({ onRecharge }: WelcomeModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Lu une seule fois au montage : l'effet ci-dessous retire le paramètre de
  // l'URL, ce qui fermerait la modale si on le relisait à chaque rendu.
  const [open, setOpen] = useState(() => searchParams?.get("welcome") === "1");

  useEffect(() => {
    if (searchParams?.get("welcome") !== "1") return;
    // Retire ?welcome (et le &callbackUrl que NextAuth ajoute après une
    // première connexion Google) pour qu'un rafraîchissement ne la réaffiche pas.
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    url.searchParams.delete("callbackUrl");
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  function handleRecharge() {
    setOpen(false);
    onRecharge();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(event) => event.stopPropagation()}
        className="relative my-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
          <Wallet className="h-7 w-7" />
        </span>

        <h2 id="welcome-title" className="mt-5 text-xl font-bold text-white">
          Bienvenue sur FlashCodeSMS !
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Pour commencer à louer des numéros, veuillez d&apos;abord recharger votre solde.
        </p>

        <button
          type="button"
          onClick={handleRecharge}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          Recharger mon solde
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 w-full rounded-lg px-4 py-2 text-sm text-slate-400 transition hover:text-white"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
