import { TierCard, TierCta } from "@/components/pricing/tier-card";
import { RECHARGE_AMOUNTS } from "@/lib/packs";

// Crédit pur, pas des packs d'activations promises : le catalogue tarife
// chaque pays/service indépendamment (voir scripts/sync-catalog.ts) et suit
// les coûts fournisseur, si bien qu'aucun ratio FCFA-par-activation fixe ne
// tiendrait dans la durée. Un solde rechargé, débité au prix réel affiché à
// l'achat — les paliers supérieurs ajoutent un crédit offert.
export function Pricing() {
  return (
    <section id="tarifs" className="bg-slate-50 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Rechargez, recevez vos SMS
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Un solde en FCFA, débité au prix réel de chaque numéro. Plus vous rechargez, plus on vous offre de
            crédit.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {RECHARGE_AMOUNTS.map((amount) => (
            <TierCard
              key={amount.id}
              amount={amount}
              theme="light"
              cta={
                <TierCta href={`/register?pack=${amount.id}`} featured={amount.featured}>
                  Recharger
                </TierCta>
              }
            />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Paiement Mobile Money sécurisé. Crédit sans expiration, remboursé automatiquement si aucun SMS n&apos;arrive.
        </p>
      </div>
    </section>
  );
}
