import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Conditions Générales — OmniCodeSMS",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="prose prose-slate mx-auto max-w-3xl px-6 py-24">
        <h1>Conditions Générales</h1>
        <p className="text-sm text-slate-500">Dernière mise à jour : janvier 2026</p>

        <h2>1. Acceptation des conditions</h2>
        <p>
          En accédant à OmniCodeSMS et en utilisant nos services, vous acceptez d&apos;être lié
          par les présentes Conditions Générales d&apos;Utilisation. Si vous n&apos;acceptez pas
          ces conditions, veuillez ne pas utiliser la plateforme.
        </p>

        <h2>2. Description du service</h2>
        <p>
          OmniCodeSMS fournit des numéros de téléphone virtuels permettant de recevoir des
          messages SMS de vérification pour des services tiers. Ces numéros sont fournis à titre
          temporaire et ne constituent pas une ligne téléphonique personnelle.
        </p>

        <h2>3. Compte utilisateur</h2>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants de connexion et de
          toute activité effectuée depuis votre compte. Vous vous engagez à fournir des
          informations exactes lors de votre inscription.
        </p>

        <h2>4. Utilisation acceptable</h2>
        <p>
          Il est interdit d&apos;utiliser OmniCodeSMS à des fins illégales, frauduleuses ou
          contraires aux conditions d&apos;utilisation des services tiers pour lesquels un numéro
          est loué.
        </p>

        <h2>5. Paiements et remboursements</h2>
        <p>
          Les crédits achetés sur OmniCodeSMS ne sont ni remboursables ni transférables, sauf en
          cas d&apos;erreur technique avérée imputable à notre plateforme.
        </p>

        <h2>6. Modification des conditions</h2>
        <p>
          Nous nous réservons le droit de modifier ces conditions à tout moment. Les
          utilisateurs seront informés de tout changement important via la plateforme.
        </p>
      </div>
    </div>
  );
}
