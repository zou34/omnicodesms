"use client";

import type { OrderStatus } from "@prisma/client";
import { CheckCircle2, Clock, Copy, Loader2, XCircle, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { OrderVM } from "@/components/dashboard/types";

interface ActiveOrdersProps {
  orders: OrderVM[];
  onOrderUpdated: (order: Partial<OrderVM> & { id: string }) => void;
  isMockSmsProvider: boolean;
}

const POLL_INTERVAL_MS = 3000;

export function ActiveOrders({ orders, onOrderUpdated, isMockSmsProvider }: ActiveOrdersProps) {
  // Read the latest orders inside the interval without re-creating it on
  // every render (a purchase or a status update shouldn't reset the timer).
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    const interval = setInterval(async () => {
      const pending = ordersRef.current.filter((order) => order.status === "PENDING");
      if (pending.length === 0) return;

      await Promise.all(
        pending.map(async (order) => {
          try {
            const response = await fetch(`/api/orders/${order.id}`);
            if (!response.ok) return;
            const data = await response.json();
            onOrderUpdated({
              id: order.id,
              status: data.status,
              smsCode: data.smsCode,
              fullSms: data.fullSms,
            });
          } catch {
            // Transient network error — retried on the next tick.
          }
        })
      );
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [onOrderUpdated]);

  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Mes numéros actifs</h2>
        <p className="mt-4 text-sm text-slate-500">Aucune commande pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">
        Mes numéros actifs <span className="text-slate-500">({orders.length})</span>
      </h2>

      <div className="mt-4 space-y-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isMockSmsProvider={isMockSmsProvider}
            onOrderUpdated={onOrderUpdated}
          />
        ))}
      </div>
    </section>
  );
}

function OrderCard({
  order,
  isMockSmsProvider,
  onOrderUpdated,
}: {
  order: OrderVM;
  isMockSmsProvider: boolean;
  onOrderUpdated: (order: Partial<OrderVM> & { id: string }) => void;
}) {
  const [copied, setCopied] = useState<"phone" | "code" | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  async function simulateSms() {
    setIsSimulating(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/simulate-sms`, { method: "POST" });
      if (!response.ok) return;
      const data = await response.json();
      onOrderUpdated({ id: order.id, status: data.status, smsCode: data.smsCode, fullSms: data.fullSms });
    } catch {
      // Transient network error — the button stays visible to retry.
    } finally {
      setIsSimulating(false);
    }
  }

  function copyToClipboard(value: string, kind: "phone" | "code") {
    navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">
            {order.countryName} ({order.countryCode}) · {order.serviceName}
          </p>
          {order.phoneNumber && (
            <button
              type="button"
              onClick={() => copyToClipboard(order.phoneNumber!, "phone")}
              className="mt-1 flex items-center gap-2 whitespace-nowrap font-mono text-base text-white hover:text-blue-400"
            >
              {order.phoneNumber}
              <Copy className="h-3.5 w-3.5" />
              {copied === "phone" && <span className="text-xs text-blue-400">Copié !</span>}
            </button>
          )}
        </div>

        <StatusBadge status={order.status} />
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3">
        {order.status === "PENDING" && (
          // `flex-wrap` + `whitespace-nowrap` : sur un écran de téléphone le
          // bouton "Simuler réception SMS" (shrink-0) écrasait le libellé, qui
          // se cassait alors sur quatre lignes. Il passe désormais à la ligne
          // suivante au lieu de comprimer le texte.
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="flex items-center gap-2 whitespace-nowrap text-sm text-amber-400">
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              En attente du SMS...
            </span>
            {isMockSmsProvider && (
              <button
                type="button"
                onClick={simulateSms}
                disabled={isSimulating}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSimulating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Simuler réception SMS
              </button>
            )}
          </div>
        )}

        {order.status === "COMPLETED" && order.smsCode && (
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
            <div>
              <p className="text-xs text-emerald-400">Code reçu</p>
              <p className="font-mono text-lg font-semibold text-emerald-300">{order.smsCode}</p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(order.smsCode!, "code")}
              className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
            >
              {copied === "code" ? "Copié !" : "Copier"}
            </button>
          </div>
        )}

        {(order.status === "CANCELLED" || order.status === "EXPIRED") && (
          <p className="text-sm text-slate-500">
            {order.status === "CANCELLED" ? "Commande annulée." : "Expirée sans réception de SMS."}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { label: string; className: string; icon: typeof Clock }> = {
    PENDING: {
      label: "En attente",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      icon: Clock,
    },
    ACTIVE: {
      label: "Active",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-400",
      icon: Clock,
    },
    COMPLETED: {
      label: "Reçu",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      icon: CheckCircle2,
    },
    CANCELLED: {
      label: "Annulée",
      className: "border-slate-700 bg-slate-800/50 text-slate-400",
      icon: XCircle,
    },
    EXPIRED: {
      label: "Expirée",
      className: "border-red-500/30 bg-red-500/10 text-red-400",
      icon: XCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
