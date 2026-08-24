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
const SITE_DESCRIPTION = "OmniCodeSMS — plateforme de numéros virtuels pour la réception de SMS.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "OmniCodeSMS",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "OmniCodeSMS",
    description: SITE_DESCRIPTION,
    url: APP_URL,
    siteName: "OmniCodeSMS",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "OmniCodeSMS",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
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
