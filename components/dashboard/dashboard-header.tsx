"use client";

import { Wallet } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";

interface DashboardHeaderProps {
  userName: string | null;
  userEmail: string | null;
  balance: number;
}

export function DashboardHeader({ userName, userEmail, balance }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-white">OmniCodeSMS</span>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
            <Wallet className="h-4 w-4" />
            {balance.toLocaleString("fr-FR")} FCFA
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-white">{userName ?? "Utilisateur"}</p>
            <p className="text-xs text-slate-500">{userEmail}</p>
          </div>

          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
