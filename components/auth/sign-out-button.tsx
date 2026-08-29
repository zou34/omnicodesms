"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    // aria-label : le libellé est masqué sous le breakpoint `sm`, le bouton
    // se réduit alors à une icône sans nom accessible.
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      aria-label="Se déconnecter"
      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Se déconnecter</span>
    </button>
  );
}
