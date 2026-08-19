import { Pagination } from "@/components/admin/pagination";
import { TransactionsTable } from "@/components/admin/transactions-table";
import { getTransactionsPage } from "@/lib/admin/queries";

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const { transactions, totalPages, totalCount } = await getTransactionsPage(page);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Transactions</h1>
      <p className="mt-1 text-sm text-slate-500">Historique complet des paiements et recharges.</p>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <TransactionsTable transactions={transactions} />
        <Pagination basePath="/admin/transactions" page={page} totalPages={totalPages} totalCount={totalCount} />
      </div>
    </div>
  );
}
