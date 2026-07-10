import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AuthShellProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ icon: Icon, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Subtle star-field / particle accents, tucked in the corners */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 bg-[radial-gradient(circle,rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[length:22px_22px] opacity-[0.12]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 bg-[radial-gradient(circle,rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[length:22px_22px] opacity-[0.08]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-blue-400 ring-1 ring-slate-700">
            <Icon className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
