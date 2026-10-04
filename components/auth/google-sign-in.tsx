"use client";

import { Info, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { GoogleIcon } from "@/components/auth/google-icon";

interface GoogleSignInProps {
  callbackUrl: string;
  /**
   * Faux dans un navigateur intégré (TikTok, Facebook...), où Google bloque
   * l'OAuth — détecté côté serveur (lib/in-app-browser.ts) pour que le bouton
   * n'apparaisse jamais puis disparaisse à l'hydratation.
   */
  available: boolean;
  /**
   * Explique pourquoi le bouton manque (page de connexion : un client inscrit
   * via Google n'a pas de mot de passe et doit savoir quoi faire). Sur
   * l'inscription, on se contente de mettre le formulaire e-mail en avant.
   */
  showUnavailableHint?: boolean;
}

/** Bouton Google + séparateur « ou », partagé par la connexion et l'inscription. */
export function GoogleSignIn({ callbackUrl, available, showUnavailableHint = false }: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!available) {
    if (!showUnavailableHint) return null;

    return (
      <p className="mb-6 flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <span>
          Compte Google ? La connexion Google ne fonctionne pas dans ce navigateur intégré. Ouvrez cette
          page dans Chrome ou Safari (menu <span className="font-semibold text-slate-300">⋯</span> →
          « Ouvrir dans le navigateur »).
        </span>
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => {
          setIsLoading(true);
          signIn("google", { callbackUrl });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continuer avec Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-xs uppercase text-slate-500">ou</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
    </>
  );
}
