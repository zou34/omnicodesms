"use client";

import type { OrderStatus } from "@prisma/client";
import { CheckCircle2, Clock, Copy, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { OrderVM } from "@/components/dashboard/types";

interface ActiveOrdersProps {
  orders: OrderVM[];
  onOrderUpdated: (order: Partial<OrderVM> & { id: string }) => void;
}

const POLL_INTERVAL_MS = 3000;

// GrizzlySMS refuse toute annulation dans les 2 minutes qui suivent l'achat
// (EARLY_CANCEL_DENIED). Le bouton s'active à ce moment-là plutôt que de
// laisser le client essuyer un refus ; la route revérifie de toute façon.
const CANCEL_AVAILABLE_AFTER_MS = 2 * 60 * 1000;

export function ActiveOrders({ orders, onOrderUpdated }: ActiveOrdersProps) {
  // Read the latest orders inside the interval without re-creating it on
  // every render (a purchase or a status update shouldn't reset the timer).
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    const interval = setInterval(async () => {
      // Onglet en arrière-plan : inutile d'interroger le fournisseur, le
      // prochain tick au retour sur l'onglet rattrapera l'état.
      if (document.hidden) return;

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
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Mes numéros actifs</h2>
        <p className="mt-4 text-sm text-slate-500">Aucune commande pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-white">
        Mes numéros actifs <span className="text-slate-500">({orders.length})</span>
      </h2>

      <div className="mt-4 space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onOrderUpdated={onOrderUpdated} />
        ))}
      </div>
    </section>
  );
}

/**
 * Copie dans le presse-papiers, avec repli. L'API Clipboard est absente ou
 * refusée dans plusieurs navigateurs intégrés (TikTok, Facebook) : on retombe
 * alors sur l'ancienne sélection + execCommand. Renvoie false si rien n'a
 * marché, pour ne jamais afficher un faux « Copié ! ».
 */
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Refusé (contexte non sécurisé, permission) : on tente le repli.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    // 16 px : en dessous, iOS zoome sur le champ au moment de la sélection.
    textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px;";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, value.length); // iOS ignore select() seul.
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

/**
 * Horloge à la seconde, active seulement tant qu'il y a quelque chose à
 * décompter. Initialisée tout de suite (et non après le montage) pour que le
 * décompte figure dès le premier rendu, y compris dans le HTML serveur ; les
 * éléments qui l'affichent portent `suppressHydrationWarning`, l'heure du
 * serveur et celle du navigateur pouvant différer d'une seconde.
 */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  return now;
}

/** "MM:SS", toujours sur deux chiffres : 01:59, 00:05, 18:30. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

type CopyTarget = "phone" | "code";

function OrderCard({
  order,
  onOrderUpdated,
}: {
  order: OrderVM;
  onOrderUpdated: ActiveOrdersProps["onOrderUpdated"];
}) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [copyFailed, setCopyFailed] = useState<CopyTarget | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isPending = order.status === "PENDING";
  const now = useNow(isPending);
  const msUntilExpiry = order.expiresAt ? new Date(order.expiresAt).getTime() - now : null;
  const msUntilCancel = new Date(order.createdAt).getTime() + CANCEL_AVAILABLE_AFTER_MS - now;
  const canCancel = msUntilCancel <= 0;

  async function handleCopy(value: string, target: CopyTarget) {
    const ok = await copyText(value);
    setCopied(ok ? target : null);
    setCopyFailed(ok ? null : target);
    if (ok) setTimeout(() => setCopied(null), 1500);
  }

  async function handleCancel() {
    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        setCancelError(data?.error ?? "Annulation impossible pour le moment. Réessayez.");
        return;
      }

      // Le serveur renvoie l'issue réelle : annulée (remboursée), ou SMS
      // arrivé entre-temps — dans ce cas le code s'affiche au lieu d'être perdu.
      onOrderUpdated({ id: order.id, status: data.status, smsCode: data.smsCode, fullSms: data.fullSms });
    } catch {
      setCancelError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm text-slate-400">
          {order.countryName} ({order.countryCode}) · {order.serviceName}
        </p>
        <StatusBadge status={order.status} />
      </div>

      {/* Numéro sur sa propre ligne, autorisé à passer à la ligne : sur un
          écran de 360 px, il chevauchait le badge de statut. `select-all` :
          un appui long sélectionne tout le numéro si la copie échoue. */}
      {order.phoneNumber && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="select-all break-all font-mono text-lg text-white">{order.phoneNumber}</span>
          <button
            type="button"
            onClick={() => handleCopy(order.phoneNumber!, "phone")}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied === "phone" ? "Copié !" : "Copier"}
          </button>
        </div>
      )}
      {copyFailed === "phone" && (
        <p className="mt-1 text-xs text-amber-400">Copie bloquée par ce navigateur : appui long sur le numéro.</p>
      )}

      <div className="mt-3 border-t border-slate-800 pt-3">
        {isPending && (
          <div>
            {/* Compte à rebours d'expiration, mis en avant : le client voit
                d'un coup d'œil combien de temps le numéro reste actif. */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium text-amber-300">
                <Clock className="h-4 w-4 shrink-0 animate-pulse" />
                En attente du SMS...
              </span>
              {msUntilExpiry !== null && (
                <span className="shrink-0 text-right">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-amber-400/80">
                    {msUntilExpiry > 0 ? "Temps restant" : "Expiration..."}
                  </span>
                  <span
                    suppressHydrationWarning
                    className="block font-mono text-2xl font-bold tabular-nums leading-tight text-amber-300"
                  >
                    {formatCountdown(msUntilExpiry)}
                  </span>
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              La réception du SMS peut prendre quelques minutes selon le service. Sans SMS, la commande est
              annulée à l&apos;expiration et vous êtes intégralement remboursé.
            </p>

            {/* Toujours affiché : grisé pendant les 2 premières minutes (refus
                GrizzlySMS, voir CANCEL_AVAILABLE_AFTER_MS), rouge et cliquable
                ensuite. */}
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling || !canCancel}
              suppressHydrationWarning
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed sm:w-auto ${
                canCancel
                  ? "border-red-500/50 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-60"
                  : "border-slate-700 bg-slate-800/60 text-slate-500"
              }`}
            >
              {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
              <span suppressHydrationWarning className="tabular-nums">
                {canCancel
                  ? "Pas de SMS ? Annuler et être remboursé"
                  : `Annulation possible dans ${formatCountdown(msUntilCancel)}`}
              </span>
            </button>
            {cancelError && <p className="mt-2 text-xs text-red-400">{cancelError}</p>}
          </div>
        )}

        {order.status === "COMPLETED" && order.smsCode && (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs text-emerald-400">Code reçu</p>
                <p className="select-all break-all font-mono text-lg font-semibold text-emerald-300">
                  {order.smsCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(order.smsCode!, "code")}
                className="btn-glow btn-glow-emerald shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                {copied === "code" ? "Copié !" : "Copier"}
              </button>
            </div>
            {copyFailed === "code" && (
              <p className="mt-1 text-xs text-amber-400">Copie bloquée par ce navigateur : appui long sur le code.</p>
            )}
          </>
        )}

        {(order.status === "CANCELLED" || order.status === "EXPIRED") && (
          <p className="text-sm text-slate-500">
            {order.status === "CANCELLED" ? "Commande annulée" : "Expirée sans réception de SMS"} — montant
            intégralement remboursé sur votre solde.
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
