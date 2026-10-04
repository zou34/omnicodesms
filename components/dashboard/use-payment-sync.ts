"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { META_PIXEL_CURRENCY, trackMetaEventOnce } from "@/lib/meta-pixel";

// Synchronise le solde affiché avec une recharge SasPay.
//
// Le solde n'est crédité que par le webhook (app/api/webhooks/payment), qui
// peut arriver avant, pendant ou bien après le retour du client sur le
// dashboard — de quelques secondes à plusieurs minutes avec le Mobile Money.
// Un rafraîchissement unique à heure fixe rate donc souvent le crédit. Ici on
// interroge /api/payments/status jusqu'à ce que CETTE recharge soit réglée,
// puis on applique le solde du serveur une seule fois et on s'arrête.
//
// Deux façons de revenir sur l'application sont couvertes :
//  - la redirection SasPay (/dashboard?payment=success&ref=...) ;
//  - le retour sans redirection : bouton Précédent (page restaurée depuis le
//    cache du navigateur), onglet ou PWA remis au premier plan après avoir
//    validé le paiement sur le téléphone. La référence est alors retrouvée
//    dans le localStorage, posée par la modale de recharge avant de partir.

const POLL_INTERVAL_MS = 3_000;
// Après une redirection de succès : le paiement est fait, on attend le webhook.
const RETURN_WATCH_MS = 2 * 60_000;
// Retour sans redirection : le client a peut-être abandonné, on reste bref.
const RESUME_WATCH_MS = 30_000;
// Au-delà, une recharge en attente n'est plus suivie au retour.
const PENDING_RECENT_MS = 30 * 60_000;
const PENDING_MAX_AGE_MS = 24 * 60 * 60_000;

const PENDING_KEY = "fcs:pending-checkout";
const TRACKED_KEY = "fcs:tracked-purchases";
const TRACKED_MAX = 20;

interface PendingCheckout {
  reference: string;
  createdAt: number;
}

interface StatusResponse {
  transaction: { reference: string | null; status: "PENDING" | "SUCCESS" | "FAILED"; amount: string } | null;
  balance: string;
}

export type PaymentSyncState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "credited" }
  | { phase: "failed" }
  | { phase: "delayed" }
  | { phase: "cancelled" };

// localStorage peut être indisponible (navigation privée, navigateur intégré
// restrictif) : chaque accès est protégé et son absence n'empêche que le
// suivi du retour sans redirection, jamais la redirection elle-même.
function readPendingCheckout(): PendingCheckout | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCheckout>;
    if (typeof parsed.reference !== "string" || typeof parsed.createdAt !== "number") return null;
    if (Date.now() - parsed.createdAt > PENDING_MAX_AGE_MS) {
      window.localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return { reference: parsed.reference, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

/** Appelée par la modale de recharge juste avant de partir vers SasPay. */
export function savePendingCheckout(reference: string) {
  try {
    const entry: PendingCheckout = { reference, createdAt: Date.now() };
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(entry));
  } catch {
    // Voir readPendingCheckout.
  }
}

function clearPendingCheckout(reference: string) {
  try {
    if (readPendingCheckout()?.reference === reference) {
      window.localStorage.removeItem(PENDING_KEY);
    }
  } catch {
    // Voir readPendingCheckout.
  }
}

/**
 * Marque l'achat comme envoyé au Pixel Meta ; renvoie false s'il l'était
 * déjà (autre onglet, page rechargée), pour ne jamais compter deux achats.
 */
function claimPurchaseTracking(reference: string): boolean {
  try {
    const tracked = JSON.parse(window.localStorage.getItem(TRACKED_KEY) ?? "[]") as string[];
    if (tracked.includes(reference)) return false;
    window.localStorage.setItem(TRACKED_KEY, JSON.stringify([...tracked, reference].slice(-TRACKED_MAX)));
  } catch {
    // Sans stockage, l'eventID (la référence) laisse Meta dédoublonner.
  }
  return true;
}

export function usePaymentSync(onBalance: (balance: number) => void) {
  const [state, setState] = useState<PaymentSyncState>({ phase: "idle" });
  const onBalanceRef = useRef(onBalance);
  onBalanceRef.current = onBalance;

  // Paramètres de retour lus une seule fois puis retirés de l'URL : gardés
  // dans une ref pour survivre au double montage des effets en StrictMode.
  const returnParams = useRef<{ payment: string | null; ref: string | null } | null>(null);

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);

  useEffect(() => {
    if (!returnParams.current) {
      const url = new URL(window.location.href);
      returnParams.current = { payment: url.searchParams.get("payment"), ref: url.searchParams.get("ref") };
      if (returnParams.current.payment || returnParams.current.ref) {
        // Sans aller-retour serveur : un rafraîchissement manuel ne relance
        // pas le suivi, et rien ne vient écraser le solde déjà appliqué.
        url.searchParams.delete("payment");
        url.searchParams.delete("ref");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    }
    const { payment, ref: refFromUrl } = returnParams.current;

    if (payment === "cancelled") {
      setState({ phase: "cancelled" });
    }

    const returnedFromCheckout = payment === "success";
    // Recharge dont le client revient par la redirection SasPay : la seule
    // dont on affiche l'attente ou l'échec. Une autre recharge suivie en
    // silence (abandonnée puis Précédent) ne doit rien afficher de tel.
    let returnRef: string | null = returnedFromCheckout
      ? refFromUrl ?? readPendingCheckout()?.reference ?? null
      : null;
    let reference: string | null = returnRef;
    // Recharges déjà réglées dans cette page : le solde n'est appliqué qu'une fois.
    const settled = new Set<string>();
    let watchUntil = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Incrémenté à chaque arrêt : une boucle de suivi interrompue pendant une
    // requête en vol ne reprend pas en parallèle de la suivante.
    let loopId = 0;
    let inFlight = false;
    let disposed = false;

    const isReturnRef = (ref: string | null) => returnedFromCheckout && ref !== null && ref === returnRef;

    function stop() {
      watchUntil = 0;
      loopId++;
      clearTimeout(timer);
    }

    function settle(ref: string, status: "SUCCESS" | "FAILED", amount: number, balance: number) {
      settled.add(ref);
      stop();
      clearPendingCheckout(ref);

      if (status === "FAILED") {
        if (isReturnRef(ref)) setState({ phase: "failed" });
        return;
      }

      onBalanceRef.current(balance);
      setState({ phase: "credited" });

      if (claimPurchaseTracking(ref)) {
        // Envoyé seulement une fois le paiement confirmé par le webhook :
        // ouvrir /dashboard?payment=success à la main ne compte rien.
        trackMetaEventOnce(
          `purchase:${ref}`,
          "Purchase",
          { value: amount, currency: META_PIXEL_CURRENCY, content_name: "Recharge FlashCodeSMS", content_type: "product" },
          ref
        );
      }
    }

    async function check() {
      if (inFlight) return;
      inFlight = true;
      const requested = reference;
      try {
        const query = requested ? `?ref=${encodeURIComponent(requested)}` : "";
        const response = await fetch(`/api/payments/status${query}`, { cache: "no-store" });
        // Erreur passagère (réseau, 429, 500) : on retentera au prochain tour.
        if (!response.ok || disposed) return;

        const data = (await response.json()) as StatusResponse;
        // Une recharge plus récente a pris le relais pendant la requête : la
        // réponse ne la concerne pas, le prochain tour l'interrogera.
        if (disposed || reference !== requested) return;
        const transaction = data.transaction;

        if (!transaction?.reference) {
          stop();
          if (returnedFromCheckout && reference === returnRef) setState({ phase: "delayed" });
          return;
        }

        // Sans `ref` dans l'URL de retour, on se fixe sur la recharge trouvée.
        if (returnedFromCheckout && returnRef === null) returnRef = transaction.reference;
        reference = transaction.reference;
        if (settled.has(reference)) {
          stop();
          return;
        }

        if (transaction.status !== "PENDING") {
          settle(reference, transaction.status, Number(transaction.amount), Number(data.balance));
        }
      } catch {
        // Hors ligne ou réponse illisible : nouvel essai au prochain tour.
      } finally {
        inFlight = false;
      }
    }

    async function tick(id: number) {
      // Onglet en arrière-plan : on ne sollicite pas le serveur, la reprise
      // au premier plan relancera le suivi (voir handleResume).
      if (document.visibilityState !== "hidden") await check();
      if (disposed || id !== loopId) return;

      if (Date.now() < watchUntil) {
        timer = setTimeout(() => void tick(id), POLL_INTERVAL_MS);
      } else {
        stop();
        if (isReturnRef(reference)) setState({ phase: "delayed" });
      }
    }

    /** Suit la recharge pendant `durationMs` (au moins une vérification). */
    function watch(durationMs: number) {
      if (reference && settled.has(reference)) return;
      const alreadyRunning = watchUntil > 0;
      watchUntil = Math.max(watchUntil, Date.now() + durationMs);
      if (!alreadyRunning) void tick(loopId);
    }

    function watchPendingCheckout() {
      const pending = readPendingCheckout();
      if (!pending || settled.has(pending.reference)) return false;
      // Une recharge lancée depuis cette même page (retour par Précédent)
      // remplace celle qu'on suivait.
      reference = pending.reference;
      if (isReturnRef(reference)) setState({ phase: "checking" });
      const isRecent = Date.now() - pending.createdAt < PENDING_RECENT_MS;
      watch(isRecent ? RESUME_WATCH_MS : 0);
      return true;
    }

    if (returnedFromCheckout) {
      setState({ phase: "checking" });
      watch(RETURN_WATCH_MS);
    } else {
      watchPendingCheckout();
    }

    function handleResume() {
      if (document.visibilityState === "hidden") return;
      if (watchPendingCheckout()) return;
      // Retour au premier plan alors que la confirmation se faisait attendre.
      if (isReturnRef(reference) && reference && !settled.has(reference)) {
        setState({ phase: "checking" });
        watch(RESUME_WATCH_MS);
      }
    }

    // `pageshow` couvre la page restaurée depuis le cache arrière-avant
    // (bouton Précédent depuis SasPay), qui ne remonte aucun composant.
    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("pageshow", handleResume);

    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("pageshow", handleResume);
    };
  }, []);

  return { state, dismiss };
}
