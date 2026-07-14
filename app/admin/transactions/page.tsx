import { Receipt } from "lucide-react";

export default function AdminTransactionsPage() {
  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Transactions</h1>
      <p className="mt-1 text-sm text-slate-500">Historique complet des paiements et recharges.</p>

      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Receipt className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-slate-500">Cette section arrive bientôt.</p>
      </div>
    </div>
  );
}
