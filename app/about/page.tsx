import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "À Propos — OmniCodeSMS",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="prose prose-slate mx-auto max-w-3xl px-6 py-24">
        <h1>À Propos de OmniCodeSMS</h1>
        <p>
          OmniCodeSMS est la solution leader de vérification par SMS en Afrique. Nous
          permettons à des milliers d&apos;utilisateurs de recevoir des codes de vérification
          en ligne, en toute sécurité et sans avoir besoin d&apos;une carte SIM physique, pour
          débloquer WhatsApp, Telegram, Google et bien d&apos;autres services.
        </p>
        <p>
          Notre mission est simple : rendre la vérification de compte instantanée, fiable et
          accessible partout sur le continent, avec une couverture de plus de 170 pays et des
          moyens de paiement locaux adaptés à chaque marché — mobile money comme Orange Money,
          Wave, MTN MoMo, ou cartes bancaires classiques.
        </p>
        <p>
          Portée par une équipe passionnée d&apos;ingénierie et de sécurité, OmniCodeSMS
          s&apos;engage à offrir une plateforme rigoureuse, transparente et sans frais cachés,
          disponible 24 heures sur 24 et 7 jours sur 7.
        </p>
      </div>
    </div>
  );
}
