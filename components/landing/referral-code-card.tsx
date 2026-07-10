"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const REFERRAL_CODE = "OMNI-2026";

export function ReferralCodeCard() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(REFERRAL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur">
      <p className="text-xs font-medium text-blue-100">Votre code de parrainage</p>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3">
        <span className="font-mono text-lg font-bold tracking-wider text-blue-900">
          {REFERRAL_CODE}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-blue-100">
        Partagez ce code et gagnez 5$ à chaque filleul actif.
      </p>
    </div>
  );
}
