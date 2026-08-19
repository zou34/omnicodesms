import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  growthPercent?: number;
  icon: LucideIcon;
}

export function MetricCard({ label, value, growthPercent, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-extrabold text-slate-900">{value}</p>

      {growthPercent !== undefined && (
        <p
          className={`mt-2 flex items-center gap-1 text-sm font-medium ${
            growthPercent >= 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {growthPercent >= 0 ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          {growthPercent >= 0 ? "+" : ""}
          {growthPercent}%{" "}
          <span className="font-normal text-slate-400">vs mois dernier</span>
        </p>
      )}
    </div>
  );
}
