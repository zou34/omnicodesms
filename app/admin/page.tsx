import { Phone, TrendingUp, Users } from "lucide-react";

import { MetricCard } from "@/components/admin/metric-card";
import { RecentTransactionsTable } from "@/components/admin/recent-transactions-table";
import { RecentUsersTable } from "@/components/admin/recent-users-table";
import { getRecentTransactions, getRecentUsers, getStats } from "@/lib/admin/queries";

export default async function AdminOverviewPage() {
  const [stats, recentUsers, recentTransactions] = await Promise.all([
    getStats(),
    getRecentUsers(),
    getRecentTransactions(),
  ]);

  return (
    <div className="px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Vue d&apos;ensemble</h1>
        <p className="mt-1 text-sm text-slate-500">
          Suivi en temps réel de l&apos;activité de la plateforme.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Revenus Totaux"
          value={`${stats.totalRevenue.amountFcfa.toLocaleString("fr-FR")} FCFA`}
          growthPercent={stats.totalRevenue.growthPercent}
          icon={TrendingUp}
        />
        <MetricCard
          label="Utilisateurs Inscrits"
          value={stats.registeredUsers.count.toLocaleString("fr-FR")}
          growthPercent={stats.registeredUsers.growthPercent}
          icon={Users}
        />
        <MetricCard
          label="Numéros Générés"
          value={stats.numbersGenerated.count.toLocaleString("fr-FR")}
          growthPercent={stats.numbersGenerated.growthPercent}
          icon={Phone}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <RecentUsersTable users={recentUsers} />
        <RecentTransactionsTable transactions={recentTransactions} />
      </div>
    </div>
  );
}
