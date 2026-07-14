import type { RecentTransaction, TransactionStatus } from "@/lib/admin/mock-data";

const STATUS_STYLES: Record<TransactionStatus, string> = {
  Payé: "bg-emerald-50 text-emerald-700",
  Échoué: "bg-red-50 text-red-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function RecentTransactionsTable({ transactions }: { transactions: RecentTransaction[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-bold text-slate-900">Transactions Récentes</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 font-medium">Utilisateur</th>
              <th className="px-6 py-3 font-medium">Montant</th>
              <th className="px-6 py-3 font-medium">Moyen de paiement</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((txn) => (
              <tr key={txn.id} className="text-slate-700">
                <td className="px-6 py-3.5 font-medium text-slate-900">{txn.userEmail}</td>
                <td className="px-6 py-3.5 text-slate-700">{formatFcfa(txn.amountFcfa)}</td>
                <td className="px-6 py-3.5 text-slate-500">{txn.paymentMethod}</td>
                <td className="px-6 py-3.5 text-slate-500">{formatDate(txn.date)}</td>
                <td className="px-6 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[txn.status]}`}
                  >
                    {txn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
