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
  /** Nom marketing du palier. */
  name: string;
  /** Accroche courte : à qui s'adresse le palier. */
  tagline: string;
  /** Montant encaissé par SasPay. */
  priceFcfa: number;
  /**
   * Crédit OFFERT en plus du montant payé, versé à la confirmation du
   * paiement (app/api/webhooks/payment). C'est lui qui rend vrai le prix
   * d'ancrage affiché ("6 000 FCFA" barré au-dessus de "5 000 FCFA") : le
   * client reçoit réellement cette valeur. Un prix de référence fictif serait
   * une pratique commerciale trompeuse — ne jamais afficher d'ancrage sans
   * bonus correspondant.
   */
  bonusFcfa: number;
  /** Palier mis en avant (badge "Recommandé", carte agrandie). */
  featured?: boolean;
  perks: string[];
}

export const RECHARGE_AMOUNTS: RechargeAmount[] = [
  {
    id: "recharge-1000",
    name: "Pass Découverte",
    tagline: "Pour tester en toute simplicité",
    priceFcfa: 1000,
    bonusFcfa: 0,
    perks: ["Crédit instantané", "Tous pays et services", "Remboursé si aucun SMS"],
  },
  {
    id: "recharge-2500",
    name: "Pass Essentiel",
    tagline: "Pour vos vérifications régulières",
    priceFcfa: 2500,
    bonusFcfa: 0,
    perks: ["Crédit instantané", "Tous pays et services", "Crédit sans expiration"],
  },
  {
    id: "recharge-5000",
    name: "Pass Pro",
    tagline: "Le meilleur rapport valeur/prix",
    priceFcfa: 5000,
    bonusFcfa: 1000,
    featured: true,
    perks: ["+1 000 FCFA de crédit offert", "Crédit sans expiration", "Support prioritaire"],
  },
  {
    id: "recharge-15000",
    name: "Pass Business",
    tagline: "Pour les gros volumes et revendeurs",
    priceFcfa: 15000,
    bonusFcfa: 3000,
    perks: ["+3 000 FCFA de crédit offert", "Idéal revendeurs et agences", "Support prioritaire"],
  },
];

/** Crédit total reçu pour un palier : montant payé + bonus offert. */
export function totalCreditFcfa(amount: RechargeAmount): number {
  return amount.priceFcfa + amount.bonusFcfa;
}

export function getRechargeAmountById(id: string): RechargeAmount | undefined {
  return RECHARGE_AMOUNTS.find((amount) => amount.id === id);
}

export function formatFcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}
