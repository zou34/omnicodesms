"use client";

import { useCallback, useState } from "react";

import { ActiveOrders } from "@/components/dashboard/active-orders";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PurchasePanel } from "@/components/dashboard/purchase-panel";
import type { CountryVM, OrderVM, PricingVM, ServiceVM } from "@/components/dashboard/types";

interface DashboardShellProps {
  userName: string | null;
  userEmail: string | null;
  initialBalance: string;
  countries: CountryVM[];
  services: ServiceVM[];
  pricing: PricingVM[];
  initialOrders: OrderVM[];
}

export function DashboardShell({
  userName,
  userEmail,
  initialBalance,
  countries,
  services,
  pricing,
  initialOrders,
}: DashboardShellProps) {
  const [balance, setBalance] = useState(Number(initialBalance));
  const [orders, setOrders] = useState<OrderVM[]>(initialOrders);

  const handleOrderCreated = useCallback((order: OrderVM) => {
    setOrders((prev) => [order, ...prev]);
    setBalance((prev) => Math.max(0, prev - Number(order.price)));
  }, []);

  const handleOrderUpdated = useCallback((update: Partial<OrderVM> & { id: string }) => {
    setOrders((prev) => prev.map((order) => (order.id === update.id ? { ...order, ...update } : order)));
  }, []);

  const handleBalanceUpdated = useCallback((newBalance: number) => {
    setBalance(newBalance);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <DashboardHeader
        userName={userName}
        userEmail={userEmail}
        balance={balance}
        onBalanceUpdated={handleBalanceUpdated}
      />

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <PurchasePanel
          countries={countries}
          services={services}
          pricing={pricing}
          onOrderCreated={handleOrderCreated}
        />
        <ActiveOrders orders={orders} onOrderUpdated={handleOrderUpdated} />
      </main>
    </div>
  );
}
