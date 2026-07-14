// Single source of truth for the FCFA activation packs — used by the
// public pricing page (components/landing/pricing.tsx) AND the dashboard
// recharge modal (components/dashboard/recharge-modal.tsx), so the two can
// never drift apart. The recharge API route also validates against this
// list server-side rather than trusting a client-submitted price.

export interface Pack {
  id: string;
  activations: number;
  priceFcfa: number;
  perActivationLabel: string;
  discountTag?: string;
  featured?: boolean;
  perks?: string[];
}

export const PACKS: Pack[] = [
  {
    id: "pack-10",
    activations: 10,
    priceFcfa: 1000,
    perActivationLabel: "100 FCFA/activation",
  },
  {
    id: "pack-32",
    activations: 32,
    priceFcfa: 3000,
    perActivationLabel: "94 FCFA/activation",
    discountTag: "-7%",
  },
  {
    id: "pack-55",
    activations: 55,
    priceFcfa: 5000,
    perActivationLabel: "91 FCFA/activation",
    discountTag: "-10%",
  },
  {
    id: "pack-175",
    activations: 175,
    priceFcfa: 15000,
    perActivationLabel: "86 FCFA/activation",
    discountTag: "-17%",
    featured: true,
    perks: ["Livraison instantanée", "Sans expiration", "Support 24/7"],
  },
];

export function getPackById(id: string): Pack | undefined {
  return PACKS.find((pack) => pack.id === id);
}

export function formatFcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}
