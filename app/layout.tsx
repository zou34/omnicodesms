import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// `||`, not `??`: Vercel can have this var present-but-empty (not just
// unset) if it's misconfigured in the dashboard — an empty string isn't
// nullish, so `??` wouldn't fall back and `new URL("")` below would crash
// (this is what broke the first production deploy: metadataBase threw
// ERR_INVALID_URL for every page, first surfaced on /admin/numbers).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_TITLE = "FlashCodeSMS — Numéros virtuels pour recevoir vos SMS de vérification";
const SITE_DESCRIPTION =
  "Recevez vos codes SMS de vérification en ligne sans carte SIM : WhatsApp, Telegram, TikTok, Google, Facebook et plus, dans plus de 100 pays. Paiement Mobile Money en FCFA, remboursement automatique si aucun SMS n'arrive.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "FlashCodeSMS",
  keywords: [
    "numéro virtuel",
    "recevoir SMS en ligne",
    "code de vérification",
    "numéro WhatsApp virtuel",
    "numéro Telegram",
    "FCFA",
    "Mobile Money",
    "FlashCodeSMS",
  ],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: APP_URL,
    siteName: "FlashCodeSMS",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
