import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — OmniCodeSMS",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="prose prose-slate mx-auto max-w-3xl px-6 py-24">
        <h1>Politique de Confidentialité</h1>
        <p className="text-sm text-slate-500">Dernière mise à jour : janvier 2026</p>

        <h2>1. Données collectées</h2>
        <p>
          Nous collectons uniquement les informations nécessaires au fonctionnement du service :
          adresse email, nom (facultatif), historique de vos commandes de numéros virtuels et
          transactions de paiement.
        </p>

        <h2>2. Utilisation des données</h2>
        <p>
          Vos données sont utilisées exclusivement pour la gestion de votre compte, le
          traitement des paiements, la prévention de la fraude et l&apos;amélioration de nos
          services. Nous ne vendons jamais vos données à des tiers.
        </p>

        <h2>3. Chiffrement et sécurité</h2>
        <p>
          Toutes les données sensibles, y compris les mots de passe, sont chiffrées grâce à des
          standards de chiffrement modernes (AES-256). Les communications avec la plateforme sont
          sécurisées via HTTPS.
        </p>

        <h2>4. Partage avec des tiers</h2>
        <p>
          Certaines données peuvent être partagées avec nos prestataires de paiement (Stripe,
          Flutterwave, opérateurs de mobile money) uniquement dans la mesure nécessaire au
          traitement de vos transactions.
        </p>

        <h2>5. Vos droits</h2>
        <p>
          Vous pouvez à tout moment demander l&apos;accès, la rectification ou la suppression de
          vos données personnelles en nous contactant via notre page de contact.
        </p>

        <h2>6. Conservation des données</h2>
        <p>
          Vos données sont conservées aussi longtemps que votre compte est actif, puis archivées
          ou supprimées conformément aux obligations légales applicables.
        </p>
      </div>
    </div>
  );
}
