import type { RecentUser } from "@/lib/admin/queries";

const ROLE_STYLES: Record<RecentUser["role"], string> = {
  USER: "bg-slate-100 text-slate-600",
  ADMIN: "bg-blue-50 text-blue-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function RecentUsersTable({ users }: { users: RecentUser[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-bold text-slate-900">Dernières Inscriptions</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Date d&apos;inscription</th>
              <th className="px-6 py-3 font-medium">Rôle</th>
              <th className="px-6 py-3 font-medium">Solde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                  Aucun utilisateur pour le moment.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="text-slate-700">
                <td className="px-6 py-3.5 font-medium text-slate-900">{user.email}</td>
                <td className="px-6 py-3.5 text-slate-500">{formatDate(user.registeredAt)}</td>
                <td className="px-6 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[user.role]}`}>
                    {user.role === "ADMIN" ? "Admin" : "Utilisateur"}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-700">{formatFcfa(user.balanceFcfa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
