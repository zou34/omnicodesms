// Single source of truth for the FCFA recharge amounts — used by the public
// pricing page (components/landing/pricing.tsx) AND the dashboard recharge
// modal (components/dashboard/recharge-modal.tsx), so the two can never
// drift apart. The checkout API route also validates against this list
// server-side rather than trusting a client-submitted amount.
//
// Modèle "crédit pur", pas "packs d'activations" : le catalogue (voir
// scripts/sync-catalog.ts) tarife chaque pays/service indépendamment et
// évolue avec les coûts fournisseur, si bien qu'aucun ratio FCFA-par-
// activation fixe ne tient dans la durée. C'est aussi le modèle observé
// chez tous les concurrents étudiés (5sim, SMS-Activate, OnlineSim, et les
// acteurs FCFA/Mobile Money directement comparables NumVirtuel et
// VirtuNum) : un solde rechargé, débité au prix réel affiché à l'achat —
// jamais un volume d'activations promis à l'avance.

export interface RechargeAmount {
  id: string;
  priceFcfa: number;
  discountTag?: string;
  featured?: boolean;
  perks?: string[];
}

export const RECHARGE_AMOUNTS: RechargeAmount[] = [
  {
    id: "recharge-1000",
    priceFcfa: 1000,
  },
  {
    id: "recharge-2500",
    priceFcfa: 2500,
  },
  {
    id: "recharge-5000",
    priceFcfa: 5000,
    featured: true,
    perks: ["Crédit instantané", "Sans expiration", "Support 24/7"],
  },
  {
    id: "recharge-10000",
    priceFcfa: 10000,
  },
];

export function getRechargeAmountById(id: string): RechargeAmount | undefined {
  return RECHARGE_AMOUNTS.find((amount) => amount.id === id);
}

export function formatFcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}
