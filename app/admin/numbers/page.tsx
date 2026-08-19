import { OrdersTable } from "@/components/admin/orders-table";
import { Pagination } from "@/components/admin/pagination";
import { getOrdersPage } from "@/lib/admin/queries";

export default async function AdminNumbersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const { orders, totalPages, totalCount } = await getOrdersPage(page);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Numéros Actifs</h1>
      <p className="mt-1 text-sm text-slate-500">Suivi des numéros virtuels en cours de location.</p>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <OrdersTable orders={orders} />
        <Pagination basePath="/admin/numbers" page={page} totalPages={totalPages} totalCount={totalCount} />
      </div>
    </div>
  );
}
