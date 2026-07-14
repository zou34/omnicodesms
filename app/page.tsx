import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { FeaturesGrid } from "@/components/landing/features-grid";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PaymentMethods } from "@/components/landing/payment-methods";
import { PhoneShowcase } from "@/components/landing/phone-showcase";
import { Pricing } from "@/components/landing/pricing";
import { ReferralSection } from "@/components/landing/referral-section";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { GlowingButton } from "@/components/ui/glowing-button";

export default function Home() {
  return (
    <>
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
            <span className="text-xl font-bold tracking-tight">OmniCodeSMS</span>

            <nav className="hidden items-center gap-6 sm:flex">
              <Link href="/login" className="text-sm font-medium text-blue-100 transition hover:text-white">
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
              >
                S&apos;inscrire
              </Link>
            </nav>
          </header>

          {/* Hero section */}
          <main className="flex flex-col items-center px-6 pt-10 pb-4 text-center sm:px-10 sm:pt-16">
            <p className="text-lg font-bold text-blue-200 sm:text-2xl">OmniCodeSMS</p>

            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight sm:text-6xl">
              Vérification Instantanée, Fiabilité Absolue
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">
              OmniCodeSMS est la plateforme professionnelle de référence pour recevoir des SMS en
              ligne et valider vos comptes sans carte SIM. Obtenez instantanément des numéros
              virtuels dans plus de 170 pays pour débloquer WhatsApp, Telegram, Google et bien
              d&apos;autres.
            </p>

            <GlowingButton
              href="/register"
              className="mt-10 px-8 py-4 text-base font-bold text-blue-900 shadow-xl shadow-blue-950/30"
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
      <FeaturesGrid />

      {/* How it works: 3 steps */}
      <HowItWorks />

      {/* Local payment methods (Africa market) */}
      <PaymentMethods />

      {/* FCFA pricing packs */}
      <Pricing />

      {/* Referral program */}
      <ReferralSection />

      {/* Final CTA */}
      <FinalCta />

      <Footer />

      {/* Mobile-only fixed bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-white/10 bg-blue-950/90 p-4 backdrop-blur sm:hidden">
        <Link
          href="/login"
          className="flex-1 rounded-full border border-white/30 py-3 text-center text-sm font-semibold text-white"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="flex-1 rounded-full bg-blue-500 py-3 text-center text-sm font-semibold text-white"
        >
          Commencer Maintenant
        </Link>
      </nav>
    </>
  );
}
