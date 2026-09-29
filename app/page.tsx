import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo-mark";
import { SplashScreen } from "@/components/brand/splash-screen";

import { Faq, FAQ_QUESTIONS } from "@/components/landing/faq";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PaymentMethods } from "@/components/landing/payment-methods";
import { PhoneShowcase } from "@/components/landing/phone-showcase";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";
import { GlowingButton } from "@/components/ui/glowing-button";
import { RECHARGE_AMOUNTS } from "@/lib/packs";
import { prisma } from "@/lib/prisma";

// Le prix plancher affiché ("à partir de…") suit le catalogue, resynchronisé
// régulièrement : la page est régénérée au plus toutes les heures.
export const revalidate = 3600;

// `||`, pas `??` — voir app/layout.tsx.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const HOME_TITLE = "Numéro Virtuel & Validation SMS en Ligne | FlashCodeSMS";
const HOME_DESCRIPTION =
  "Recevez vos SMS en ligne avec un numéro virtuel : créez un compte WhatsApp, TikTok ou Telegram sans puce. Validation SMS instantanée, paiement Mobile Money en FCFA.";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  // Canonique propre à l'accueil : placé dans le layout racine, il serait
  // hérité par toutes les pages et les ferait passer pour des doublons.
  alternates: { canonical: "/" },
  // L'image de partage vient de app/opengraph-image.png (convention Next.js).
  openGraph: { title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/", type: "website" },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION },
};

/**
 * Données structurées (schema.org) pour les résultats enrichis Google.
 * Uniquement des faits vérifiables : prix réels (catalogue + paliers), FAQ
 * affichée sur la page. Pas de note ni d'avis — une note auto-attribuée est
 * contraire aux règles de Google et expose à une action manuelle.
 */
function buildJsonLd(minPriceFcfa: number | null) {
  const prices = RECHARGE_AMOUNTS.map((amount) => amount.priceFcfa);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${APP_URL}/#organization`,
        name: "FlashCodeSMS",
        url: APP_URL,
        logo: `${APP_URL}/icon-512.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${APP_URL}/#website`,
        name: "FlashCodeSMS",
        url: APP_URL,
        inLanguage: "fr",
        publisher: { "@id": `${APP_URL}/#organization` },
      },
      {
        "@type": "WebApplication",
        name: "FlashCodeSMS",
        url: APP_URL,
        description: HOME_DESCRIPTION,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web, Android, iOS",
        inLanguage: "fr",
        publisher: { "@id": `${APP_URL}/#organization` },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "XOF",
          lowPrice: minPriceFcfa ?? Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: prices.length,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_QUESTIONS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

async function getMinPriceFcfa(): Promise<number | null> {
  try {
    const result = await prisma.countryService.aggregate({
      where: { isActive: true, country: { isActive: true }, service: { isActive: true } },
      _min: { price: true },
    });
    return result._min.price === null ? null : Number(result._min.price);
  } catch (error) {
    // Base injoignable (ex. au build) : la page reste servie, avec un texte
    // sans chiffre plutôt qu'un prix faux.
    console.error("[Home] prix minimum indisponible", error);
    return null;
  }
}

export default async function Home() {
  const minPriceFcfa = await getMinPriceFcfa();

  return (
    <>
      <script
        type="application/ld+json"
        // Échappe "<" : un texte de FAQ contenant "</script>" ne doit jamais
        // pouvoir refermer la balise.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(minPriceFcfa)).replace(/</g, "\\u003c") }}
      />
      <SplashScreen />
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-900 to-blue-700 text-white">
        {/* Subtle dot-grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] bg-[length:28px_28px] opacity-20"
        />
        {/* Soft glow accents */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />

        <div className="relative flex flex-col pb-24 sm:pb-0">
          {/* Public header */}
          <header className="flex items-center justify-between px-6 py-6 sm:px-10">
            <span className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
              <LogoMark withBackground className="h-9 w-9" />
              FlashCodeSMS
            </span>

            <nav className="hidden items-center gap-6 sm:flex">
              <InstallPwaButton className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-blue-100 transition hover:border-white/40 hover:text-white">
                Installer l&apos;application
              </InstallPwaButton>
              <Link
                href="/login"
                className="btn-glow btn-glow-white rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="btn-glow rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-400"
              >
                S&apos;inscrire
              </Link>
            </nav>
          </header>

          {/* Hero section */}
          <main className="flex flex-col items-center px-6 pt-10 pb-4 text-center sm:px-10 sm:pt-16">
            <p className="text-lg font-bold text-blue-200 sm:text-2xl">FlashCodeSMS</p>

            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight sm:text-6xl">
              Numéro Virtuel Instantané&nbsp;: Recevez vos SMS de Validation en Ligne
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">
              FlashCodeSMS vous donne un numéro virtuel en quelques secondes pour recevoir vos SMS en
              ligne : créez votre compte WhatsApp, TikTok, Telegram, Google ou Instagram sans puce ni carte
              SIM, dans plus de 100 pays. Validation SMS instantanée, paiement Mobile Money en FCFA, et
              remboursement automatique si le code n&apos;arrive pas.
            </p>

            <GlowingButton
              href="/register"
              className="mt-6 px-8 py-4 text-base font-bold text-blue-900 shadow-xl shadow-blue-950/30 sm:mt-10"
              maskClassName="bg-white group-hover:bg-blue-50"
            >
              Commencer Maintenant
              <ArrowRight className="h-5 w-5" />
            </GlowingButton>
          </main>

          {/* Showcase: phone mockup + floating service bubbles */}
          <PhoneShowcase />
        </div>
      </div>

      {/* Why choose us */}
      <WhyChooseUs />

      {/* 6 core features, each with its own CSS-only mockup */}
      <FeaturesGrid minPriceFcfa={minPriceFcfa} />

      {/* How it works: 3 steps */}
      <HowItWorks />

      {/* Local payment methods (Africa market) */}
      <PaymentMethods />

      {/* FCFA pricing packs */}
      <Pricing />

      {/* Final CTA */}
      <FinalCta />

      {/* Preuve sociale (avis réels uniquement : masquée tant qu'il n'y en a
          pas), puis levée des dernières objections avant le pied de page. */}
      <Testimonials />

      <Faq />

      <Footer />

      {/* Mobile-only fixed bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-white/10 bg-blue-950/90 p-4 backdrop-blur sm:hidden">
        <InstallPwaButton className="btn-glow btn-glow-white flex shrink-0 items-center justify-center rounded-full border border-white/30 p-3 text-white hover:bg-white/10" />
        <Link
          href="/login"
          className="btn-glow btn-glow-white flex-1 rounded-full border border-white/30 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="btn-glow flex-1 rounded-full bg-blue-500 py-3 text-center text-sm font-semibold text-white"
        >
          Commencer Maintenant
        </Link>
      </nav>
    </>
  );
}
