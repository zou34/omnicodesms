"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { ActiveOrders } from "@/components/dashboard/active-orders";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PaymentStatusBanner } from "@/components/dashboard/payment-status-banner";
import { PurchasePanel } from "@/components/dashboard/purchase-panel";
import { RechargeModal } from "@/components/dashboard/recharge-modal";
import type { CountryVM, OrderVM, PricingVM, ServiceVM } from "@/components/dashboard/types";
import { usePaymentSync } from "@/components/dashboard/use-payment-sync";
import { WelcomeModal } from "@/components/dashboard/welcome-modal";
import { trackMetaEventOnce } from "@/lib/meta-pixel";

interface DashboardShellProps {
  userName: string | null;
  userEmail: string | null;
  initialBalance: string;
  /** Palier choisi sur la page d'accueil avant l'inscription (?pack=). */
  initialPackId: string | null;
  /** Première arrivée après la création du compte (?welcome=1). */
  isNewUser: boolean;
  countries: CountryVM[];
  services: ServiceVM[];
  pricing: PricingVM[];
  initialOrders: OrderVM[];
}

export function DashboardShell({
  userName,
  userEmail,
  initialBalance,
  initialPackId,
  isNewUser,
  countries,
  services,
  pricing,
  initialOrders,
}: DashboardShellProps) {
  const router = useRouter();
  const [balance, setBalance] = useState(Number(initialBalance));
  const [orders, setOrders] = useState<OrderVM[]>(initialOrders);
  // Appelé avant les autres effets de ce composant : il retire ?payment/&ref
  // de l'URL avant que celui de ?pack ne la relise.
  const paymentSync = usePaymentSync(setBalance);
  // Lifted above DashboardHeader so PurchasePanel can also open it — e.g.
  // when a purchase fails specifically because the user's own balance is
  // too low, not because a provider is out of stock or unreachable.
  //
  // Ouvert d'emblée quand le client arrive avec un palier déjà choisi sur la
  // page d'accueil : il a exprimé son intention, on ne la lui refait pas
  // reformuler (ni via la modale de bienvenue, ni en re-choisissant le palier).
  const [isRechargeOpen, setIsRechargeOpen] = useState(initialPackId !== null);

  // Conversion « inscription » du Pixel Meta. Envoyée ici plutôt que dans le
  // formulaire : les deux parcours (e-mail et première connexion Google via
  // pages.newUser) aboutissent tous deux sur /dashboard?welcome=1.
  useEffect(() => {
    if (isNewUser) trackMetaEventOnce("complete-registration", "CompleteRegistration");
  }, [isNewUser]);

  useEffect(() => {
    if (!initialPackId) return;
    // Retire ?pack (et ?welcome / ?callbackUrl, la modale de bienvenue n'étant
    // pas montée dans ce cas) pour qu'un rafraîchissement ne rouvre rien.
    const url = new URL(window.location.href);
    ["pack", "welcome", "callbackUrl"].forEach((param) => url.searchParams.delete(param));
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DashboardShell doesn't remount across a server re-render (the
  // router.replace calls that strip ?pack / ?welcome) — so `balance` needs
  // to be explicitly re-synced when the server sends a fresh
  // `initialBalance`, rather than relying on useState's one-time init.
  useEffect(() => {
    setBalance(Number(initialBalance));
  }, [initialBalance]);

  const handleOrderCreated = useCallback((order: OrderVM) => {
    setOrders((prev) => [order, ...prev]);
    setBalance((prev) => Math.max(0, prev - Number(order.price)));
  }, []);

  // Commandes dont le remboursement a déjà été reflété à l'écran : l'updater
  // de setOrders peut être rejoué (StrictMode), le crédit ne doit pas l'être.
  const refundedOrderIds = useRef(new Set<string>());

  const handleOrderUpdated = useCallback((update: Partial<OrderVM> & { id: string }) => {
    setOrders((prev) => {
      const before = prev.find((order) => order.id === update.id);
      // Commande sortie de PENDING sans SMS : le serveur a déjà recrédité le
      // solde (lib/orders/settle.ts), on le reflète tout de suite à l'écran.
      if (
        before?.status === "PENDING" &&
        (update.status === "CANCELLED" || update.status === "EXPIRED") &&
        !refundedOrderIds.current.has(before.id)
      ) {
        refundedOrderIds.current.add(before.id);
        setBalance((balance) => balance + Number(before.price));
      }
      return prev.map((order) => (order.id === update.id ? { ...order, ...update } : order));
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <DashboardHeader
        userName={userName}
        userEmail={userEmail}
        balance={balance}
        onOpenRecharge={() => setIsRechargeOpen(true)}
      />

      <PaymentStatusBanner state={paymentSync.state} onDismiss={paymentSync.dismiss} />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
        <PurchasePanel
          balance={balance}
          countries={countries}
          services={services}
          pricing={pricing}
          onOrderCreated={handleOrderCreated}
          onInsufficientBalance={() => setIsRechargeOpen(true)}
        />
        <ActiveOrders orders={orders} onOrderUpdated={handleOrderUpdated} />
      </main>

      {/* Rendered here rather than inside DashboardHeader: that component's
          <header> has backdrop-blur, which would confine the modal's
          `inset-0` to the header's own box instead of the full viewport. */}
      <RechargeModal
        open={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        highlightedAmountId={initialPackId}
      />

      {!initialPackId && (
        <Suspense fallback={null}>
          <WelcomeModal onRecharge={() => setIsRechargeOpen(true)} />
        </Suspense>
      )}
    </div>
  );
}
