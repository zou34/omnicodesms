"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect } from "react";

export interface ToastState {
  type: "success" | "error";
  message: string;
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
  durationMs?: number;
}

/**
 * Minimal, self-contained toast — no provider/portal system, since nothing
 * in this app needs more than one visible at a time yet. Auto-dismisses,
 * but can also be closed early.
 */
export function Toast({ toast, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [toast, onDismiss, durationMs]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl animate-toast-in ${
        isSuccess
          ? "border-emerald-500/30 bg-emerald-950 text-emerald-100"
          : "border-red-500/30 bg-red-950 text-red-100"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
      )}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
