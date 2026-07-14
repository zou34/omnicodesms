import type { RecentUser, UserStatus } from "@/lib/admin/mock-data";

const STATUS_STYLES: Record<UserStatus, string> = {
  Actif: "bg-emerald-50 text-emerald-700",
  "En attente": "bg-amber-50 text-amber-700",
  Suspendu: "bg-red-50 text-red-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
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
              <th className="px-6 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="text-slate-700">
                <td className="px-6 py-3.5 font-medium text-slate-900">{user.email}</td>
                <td className="px-6 py-3.5 text-slate-500">{formatDate(user.registeredAt)}</td>
                <td className="px-6 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[user.status]}`}
                  >
                    {user.status}
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
