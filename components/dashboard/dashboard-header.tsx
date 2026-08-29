"use client";

import { PlusCircle, Wallet } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";

interface DashboardHeaderProps {
  userName: string | null;
  userEmail: string | null;
  balance: number;
  onOpenRecharge: () => void;
}

export function DashboardHeader({
  userName,
  userEmail,
  balance,
  onOpenRecharge,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="text-lg font-semibold tracking-tight text-white">OmniCodeSMS</span>

        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 sm:gap-2 sm:px-4 sm:text-sm">
            <Wallet className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{balance.toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* aria-label indispensable : sous le breakpoint `sm` les deux
              libellés sont masqués et le bouton n'était plus qu'une icône
              sans nom accessible (invisible pour un lecteur d'écran). */}
          <button
            type="button"
            onClick={onOpenRecharge}
            aria-label="Recharger mon solde"
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 sm:px-4 sm:text-sm"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Recharger mon solde</span>
            <span className="hidden sm:inline md:hidden">Recharger</span>
          </button>

          <InstallPwaButton className="flex shrink-0 items-center justify-center rounded-full border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white" />


          <div className="hidden text-right lg:block">
            <p className="text-sm font-medium text-white">{userName ?? "Utilisateur"}</p>
            <p className="text-xs text-slate-500">{userEmail}</p>
          </div>

          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
