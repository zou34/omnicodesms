"use client";

import { Home, RefreshCw, ServerCrash } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

// Next.js requires error.tsx to be a Client Component. It renders inside
// the root layout (html/body still wrap it), but nothing else does — so
// the card below is fully self-contained (own background, own sizing)
// rather than relying on ambient page styles that won't be there.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error.tsx]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <ServerCrash className="h-7 w-7" />
        </span>

        <h1 className="mt-5 text-xl font-bold text-white">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-slate-400">
          Quelque chose s&apos;est mal passé de notre côté. Réessayez, ou revenez à l&apos;accueil
          si le problème persiste.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
