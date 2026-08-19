import { Home, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable — OmniCodeSMS",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
          <SearchX className="h-7 w-7" />
        </span>

        <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-blue-400">
          Erreur 404
        </p>
        <h1 className="mt-2 text-xl font-bold text-white">Page introuvable</h1>
        <p className="mt-2 text-sm text-slate-400">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <Home className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
