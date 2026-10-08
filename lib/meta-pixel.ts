// Pixel Meta (Facebook/Instagram Ads) — mesure des conversions du trafic
// publicitaire. Le script de base est injecté une seule fois par
// components/analytics/meta-pixel.tsx (layout racine) ; ce module ne fait
// qu'appeler `window.fbq` s'il est présent, sans jamais lever : un bloqueur
// de publicité qui empêche le chargement du pixel ne doit casser aucun
// parcours (inscription, recharge, achat).

// `||`, pas `??` — même raison que NEXT_PUBLIC_APP_URL dans app/layout.tsx :
// une variable présente mais vide sur Vercel doit aussi retomber sur l'ID.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "4681937055286289";

// Devise ISO 4217 des montants envoyés à Meta : nos paliers sont libellés en
// franc CFA ouest-africain, exactement la devise encaissée par SasPay
// (lib/payments/SasPayProvider.ts). "FCFA" n'est pas un code ISO valide.
export const META_PIXEL_CURRENCY = "XOF";

type StandardEvent = "PageView" | "CompleteRegistration" | "InitiateCheckout" | "Purchase";

interface EventParams {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  num_items?: number;
}

type Fbq = (
  command: "track",
  event: StandardEvent,
  params?: EventParams,
  options?: { eventID?: string }
) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

// Au chargement complet d'une page, les effets de la page (ex. l'inscription
// détectée sur /dashboard?welcome=1 après une connexion Google) s'exécutent
// AVANT celui du composant MetaPixel, placé après eux dans le layout : `fbq`
// n'existe pas encore. Ces événements sont mis en attente puis envoyés dès que
// le pixel est défini, au lieu d'être perdus.
const PIXEL_WAIT_INTERVAL_MS = 100;
// Au-delà, le pixel est vraisemblablement bloqué (bloqueur de publicité).
const PIXEL_WAIT_TIMEOUT_MS = 10_000;

const pendingEvents: Array<() => void> = [];
let waitTimer: ReturnType<typeof setInterval> | undefined;

function whenPixelReady(send: () => void) {
  if (typeof window.fbq === "function") {
    send();
    return;
  }

  pendingEvents.push(send);
  if (waitTimer) return;

  const startedAt = Date.now();
  waitTimer = setInterval(() => {
    const ready = typeof window.fbq === "function";
    if (!ready && Date.now() - startedAt < PIXEL_WAIT_TIMEOUT_MS) return;

    clearInterval(waitTimer);
    waitTimer = undefined;
    const queued = pendingEvents.splice(0);
    if (ready) queued.forEach((flush) => flush());
  }, PIXEL_WAIT_INTERVAL_MS);
}

export function trackMetaEvent(event: StandardEvent, params?: EventParams, eventId?: string) {
  if (typeof window === "undefined") return;
  whenPixelReady(() => {
    try {
      // `eventID` permet à Meta de dédoublonner un même événement envoyé deux
      // fois (rechargement de page, future API Conversions côté serveur).
      window.fbq?.("track", event, params, eventId ? { eventID: eventId } : undefined);
    } catch {
      // Le suivi publicitaire ne doit jamais faire échouer l'interface.
    }
  });
}

// Événements déjà envoyés dans cet onglet : protège des effets rejoués
// (StrictMode, remontage d'un composant) qui compteraient deux conversions.
const firedEvents = new Set<string>();

/** Envoie l'événement une seule fois par clé et par chargement de page. */
export function trackMetaEventOnce(
  key: string,
  event: StandardEvent,
  params?: EventParams,
  eventId?: string
) {
  if (firedEvents.has(key)) return;
  firedEvents.add(key);
  trackMetaEvent(event, params, eventId);
}
