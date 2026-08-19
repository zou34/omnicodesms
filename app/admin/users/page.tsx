import { Pagination } from "@/components/admin/pagination";
import { UsersTable } from "@/components/admin/users-table";
import { getUsersPage } from "@/lib/admin/queries";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const { users, totalPages, totalCount } = await getUsersPage(page);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Utilisateurs</h1>
      <p className="mt-1 text-sm text-slate-500">Gestion complète des comptes utilisateurs.</p>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <UsersTable users={users} />
        <Pagination basePath="/admin/users" page={page} totalPages={totalPages} totalCount={totalCount} />
      </div>
    </div>
  );
}
