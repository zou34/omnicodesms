"use client";

import { PlusCircle, Wallet } from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";
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
        {/* Sur mobile, le logo seul : la barre porte déjà solde et boutons. */}
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
          <LogoMark withBackground className="h-8 w-8 shrink-0" />
          <span className="hidden sm:inline">FlashCodeSMS</span>
        </span>

        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 sm:gap-2 sm:px-4 sm:text-sm">
            <Wallet className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{balance.toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* Libellé visible dès le mobile : c'est l'action qui rapporte, une
              icône seule ne se lisait pas comme un bouton de recharge. */}
          <button
            type="button"
            onClick={onOpenRecharge}
            aria-label="Recharger mon solde"
            className="btn-glow flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 sm:px-4 sm:text-sm"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Recharger mon solde</span>
            <span className="md:hidden">Recharger</span>
          </button>

          {/* Masqué sous `sm` pour laisser la place au libellé « Recharger » ;
              l'installation reste proposée dans la barre mobile de l'accueil. */}
          <InstallPwaButton className="hidden shrink-0 items-center justify-center rounded-full border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white sm:flex" />


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
