import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer un compte — OmniCodeSMS",
  description:
    "Créez votre compte OmniCodeSMS et recevez vos codes de vérification SMS instantanément, sans carte SIM.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
