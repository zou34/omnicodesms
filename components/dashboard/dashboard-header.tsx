"use client";

import { PlusCircle, Wallet } from "lucide-react";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { RechargeModal } from "@/components/dashboard/recharge-modal";

interface DashboardHeaderProps {
  userName: string | null;
  userEmail: string | null;
  balance: number;
  onBalanceUpdated: (newBalance: number) => void;
}

export function DashboardHeader({ userName, userEmail, balance, onBalanceUpdated }: DashboardHeaderProps) {
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight text-white">OmniCodeSMS</span>

          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 sm:gap-2 sm:px-4 sm:text-sm">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{balance.toLocaleString("fr-FR")} FCFA</span>
            </div>

            <button
              type="button"
              onClick={() => setIsRechargeOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 sm:px-4 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">Recharger mon solde</span>
              <span className="hidden sm:inline md:hidden">Recharger</span>
            </button>

            <div className="hidden text-right lg:block">
              <p className="text-sm font-medium text-white">{userName ?? "Utilisateur"}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>

            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Rendered as a sibling, not a child, of <header>: that element has
          `backdrop-blur` (backdrop-filter), which establishes a new CSS
          containing block for `position: fixed` descendants — nesting the
          modal inside it would confine `inset-0` to the header's own
          (short) box instead of the full viewport. */}
      <RechargeModal
        open={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        onSuccess={(newBalance) => {
          onBalanceUpdated(newBalance);
        }}
      />
    </>
  );
}
