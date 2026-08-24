"use client";

import { Loader2, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Impossible d'envoyer le lien de réinitialisation.");
        return;
      }

      // The API always answers success regardless of whether the email is
      // registered — this screen shows the same thing either way.
      setSubmitted(true);
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthShell
        icon={MailCheck}
        title="Vérifiez vos e-mails"
        subtitle="Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé."
      >
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-white underline underline-offset-2"
        >
          Retour à la connexion
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={Mail}
      title="Mot de passe oublié ?"
      subtitle="Entrez votre adresse e-mail pour recevoir un lien de réinitialisation."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white">
            Adresse E-mail
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              placeholder="vous@exemple.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Envoyer le lien de réinitialisation
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        <Link href="/login" className="font-medium text-white underline underline-offset-2">
          Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  );
}
