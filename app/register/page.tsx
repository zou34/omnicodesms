import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer un compte — FlashCodeSMS",
  description:
    "Créez votre compte FlashCodeSMS et recevez vos codes de vérification SMS instantanément, sans carte SIM.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
