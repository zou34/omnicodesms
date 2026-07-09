"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
    >
      <LogOut className="h-4 w-4" />
      Se déconnecter
    </button>
  );
}
