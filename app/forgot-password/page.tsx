import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié — FlashCodeSMS",
  description: "Réinitialisez le mot de passe de votre compte FlashCodeSMS.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
