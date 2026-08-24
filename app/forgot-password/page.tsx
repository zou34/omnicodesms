import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié — OmniCodeSMS",
  description: "Réinitialisez le mot de passe de votre compte OmniCodeSMS.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
