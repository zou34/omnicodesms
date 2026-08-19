import type { RecentTransaction } from "@/lib/admin/queries";

const STATUS_STYLES: Record<RecentTransaction["status"], string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<RecentTransaction["status"], string> = {
  SUCCESS: "Payé",
  PENDING: "En attente",
  FAILED: "Échoué",
};

const TYPE_LABELS: Record<RecentTransaction["type"], string> = {
  DEPOSIT: "Dépôt",
  PURCHASE: "Achat",
  REFUND: "Remboursement",
};

const PROVIDER_LABELS: Record<RecentTransaction["provider"], string> = {
  STRIPE: "Stripe",
  FLUTTERWAVE: "Flutterwave",
  WALLET: "Portefeuille",
  MOCK: "Simulation",
  GATEWAY: "Passerelle",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFcfa(amount: number) {
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toLocaleString("fr-FR")} FCFA`;
}

export function TransactionsTable({ transactions }: { transactions: RecentTransaction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-6 py-3 font-medium">Utilisateur</th>
            <th className="px-6 py-3 font-medium">Montant</th>
            <th className="px-6 py-3 font-medium">Type</th>
            <th className="px-6 py-3 font-medium">Fournisseur</th>
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-6 py-3 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                Aucune transaction pour le moment.
              </td>
            </tr>
          )}
          {transactions.map((txn) => (
            <tr key={txn.id} className="text-slate-700">
              <td className="px-6 py-3.5 font-medium text-slate-900">{txn.userEmail}</td>
              <td
                className={`px-6 py-3.5 font-medium ${
                  txn.amountFcfa > 0 ? "text-emerald-700" : "text-slate-700"
                }`}
              >
                {formatFcfa(txn.amountFcfa)}
              </td>
              <td className="px-6 py-3.5 text-slate-500">{TYPE_LABELS[txn.type]}</td>
              <td className="px-6 py-3.5 text-slate-500">{PROVIDER_LABELS[txn.provider]}</td>
              <td className="px-6 py-3.5 text-slate-500">{formatDate(txn.date)}</td>
              <td className="px-6 py-3.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[txn.status]}`}
                >
                  {STATUS_LABELS[txn.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
