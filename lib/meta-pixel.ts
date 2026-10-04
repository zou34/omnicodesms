// Pixel Meta (Facebook/Instagram Ads) — mesure des conversions du trafic
// publicitaire. Le script de base est injecté une seule fois par
// components/analytics/meta-pixel.tsx (layout racine) ; ce module ne fait
// qu'appeler `window.fbq` s'il est présent, sans jamais lever : un bloqueur
// de publicité qui empêche le chargement du pixel ne doit casser aucun
// parcours (inscription, recharge, achat).

// `||`, pas `??` — même raison que NEXT_PUBLIC_APP_URL dans app/layout.tsx :
// une variable présente mais vide sur Vercel doit aussi retomber sur l'ID.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1653292166501672";

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

export function trackMetaEvent(event: StandardEvent, params?: EventParams, eventId?: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    // `eventID` permet à Meta de dédoublonner un même événement envoyé deux
    // fois (rechargement de page, future API Conversions côté serveur).
    window.fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // Le suivi publicitaire ne doit jamais faire échouer l'interface.
  }
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
