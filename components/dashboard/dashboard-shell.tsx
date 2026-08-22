"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

import { ActiveOrders } from "@/components/dashboard/active-orders";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PaymentStatusBanner } from "@/components/dashboard/payment-status-banner";
import { PurchasePanel } from "@/components/dashboard/purchase-panel";
import { RechargeModal } from "@/components/dashboard/recharge-modal";
import type { CountryVM, OrderVM, PricingVM, ServiceVM } from "@/components/dashboard/types";

interface DashboardShellProps {
  userName: string | null;
  userEmail: string | null;
  initialBalance: string;
  isMockSmsProvider: boolean;
  countries: CountryVM[];
  services: ServiceVM[];
  pricing: PricingVM[];
  initialOrders: OrderVM[];
}

export function DashboardShell({
  userName,
  userEmail,
  initialBalance,
  isMockSmsProvider,
  countries,
  services,
  pricing,
  initialOrders,
}: DashboardShellProps) {
  const [balance, setBalance] = useState(Number(initialBalance));
  const [orders, setOrders] = useState<OrderVM[]>(initialOrders);
  // Lifted above DashboardHeader so PurchasePanel can also open it — e.g.
  // when a purchase fails specifically because the user's own balance is
  // too low, not because a provider is out of stock or unreachable.
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);

  // DashboardShell doesn't remount across a router.refresh() (triggered by
  // PaymentStatusBanner once a payment redirect lands) — so `balance`
  // needs to be explicitly re-synced when the server sends a fresh
  // `initialBalance`, rather than relying on useState's one-time init.
  useEffect(() => {
    setBalance(Number(initialBalance));
  }, [initialBalance]);

  const handleOrderCreated = useCallback((order: OrderVM) => {
    setOrders((prev) => [order, ...prev]);
    setBalance((prev) => Math.max(0, prev - Number(order.price)));
  }, []);

  const handleOrderUpdated = useCallback((update: Partial<OrderVM> & { id: string }) => {
    setOrders((prev) => prev.map((order) => (order.id === update.id ? { ...order, ...update } : order)));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <DashboardHeader
        userName={userName}
        userEmail={userEmail}
        balance={balance}
        onOpenRecharge={() => setIsRechargeOpen(true)}
      />

      <Suspense fallback={null}>
        <PaymentStatusBanner />
      </Suspense>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <PurchasePanel
          countries={countries}
          services={services}
          pricing={pricing}
          onOrderCreated={handleOrderCreated}
          onInsufficientBalance={() => setIsRechargeOpen(true)}
        />
        <ActiveOrders
          orders={orders}
          onOrderUpdated={handleOrderUpdated}
          isMockSmsProvider={isMockSmsProvider}
        />
      </main>

      {/* Rendered here rather than inside DashboardHeader: that component's
          <header> has backdrop-blur, which would confine the modal's
          `inset-0` to the header's own box instead of the full viewport. */}
      <RechargeModal open={isRechargeOpen} onClose={() => setIsRechargeOpen(false)} />
    </div>
  );
}
