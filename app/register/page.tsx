import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { isInAppBrowser } from "@/lib/in-app-browser";
import { getRechargeAmountById } from "@/lib/packs";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer un compte — FlashCodeSMS",
  description:
    "Créez votre compte FlashCodeSMS et recevez vos codes de vérification SMS instantanément, sans carte SIM.",
};

export default async function RegisterPage({ searchParams }: { searchParams: { pack?: string } }) {
  // Palier cliqué sur la page d'accueil (components/landing/pricing.tsx) :
  // validé contre lib/packs.ts, puis transmis jusqu'au dashboard qui ouvre la
  // recharge directement dessus, au lieu de le faire choisir une seconde fois.
  const packId = getRechargeAmountById(searchParams.pack ?? "")?.id ?? null;

  // Un client déjà connecté qui clique sur un bouton de la page d'accueil n'a
  // rien à faire sur le formulaire d'inscription.
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect(packId ? `/dashboard?pack=${packId}` : "/dashboard");
  }

  return <RegisterForm packId={packId} googleAvailable={!isInAppBrowser(headers().get("user-agent"))} />;
}
