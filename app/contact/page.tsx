import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/page-header";

import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact — OmniCodeSMS",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="mx-auto max-w-md px-6 py-24">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Contactez-nous
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Une question, un problème avec votre commande ? Écrivez-nous, notre équipe vous
            répond rapidement.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
