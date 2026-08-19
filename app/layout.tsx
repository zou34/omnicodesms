import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { AuthSessionProvider } from "@/components/providers/session-provider";

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
      </body>
    </html>
  );
}
