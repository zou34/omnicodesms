import type { RecentOrder } from "@/lib/admin/queries";

const STATUS_STYLES: Record<RecentOrder["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<RecentOrder["status"], string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function OrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-6 py-3 font-medium">Utilisateur</th>
            <th className="px-6 py-3 font-medium">Pays</th>
            <th className="px-6 py-3 font-medium">Service</th>
            <th className="px-6 py-3 font-medium">Numéro</th>
            <th className="px-6 py-3 font-medium">Prix</th>
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-6 py-3 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                Aucun numéro généré pour le moment.
              </td>
            </tr>
          )}
          {orders.map((order) => (
            <tr key={order.id} className="text-slate-700">
              <td className="px-6 py-3.5 font-medium text-slate-900">{order.userEmail}</td>
              <td className="px-6 py-3.5 text-slate-500">{order.countryName}</td>
              <td className="px-6 py-3.5 text-slate-500">{order.serviceName}</td>
              <td className="px-6 py-3.5 text-slate-500">{order.phoneNumber ?? "—"}</td>
              <td className="px-6 py-3.5">{formatFcfa(order.priceFcfa)}</td>
              <td className="px-6 py-3.5 text-slate-500">{formatDate(order.createdAt)}</td>
              <td className="px-6 py-3.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
