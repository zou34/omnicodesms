import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion — FlashCodeSMS",
  description: "Connectez-vous à votre compte FlashCodeSMS pour gérer vos numéros virtuels et vos codes SMS.",
};

export default function LoginPage() {
  return <LoginForm />;
}
