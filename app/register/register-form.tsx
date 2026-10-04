"use client";

import { Loader2, Lock, Mail, User, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignIn } from "@/components/auth/google-sign-in";

interface RegisterFormProps {
  /** Palier choisi sur la page d'accueil, déjà validé côté serveur. */
  packId: string | null;
  googleAvailable: boolean;
}

export function RegisterForm({ packId, googleAvailable }: RegisterFormProps) {
  const router = useRouter();
  // Le dashboard ouvre la recharge sur ce palier (voir app/dashboard/page.tsx).
  const dashboardUrl = packId ? `/dashboard?pack=${packId}` : "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setIsLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setIsLoading(false);

      if (result?.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(dashboardUrl)}`);
        return;
      }

      router.push(packId ? `/dashboard?welcome=1&pack=${packId}` : "/dashboard?welcome=1");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      icon={UserPlus}
      title="Inscrivez-vous à FlashCodeSMS"
      subtitle="Accédez instantanément à vos numéros virtuels sécurisés."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <GoogleSignIn callbackUrl={dashboardUrl} available={googleAvailable} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-white">
            Nom
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-base text-white placeholder-slate-500 outline-none sm:text-sm focus:border-blue-500"
              placeholder="Jean Dupont"
            />
          </div>
        </div>

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
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-base text-white placeholder-slate-500 outline-none sm:text-sm focus:border-blue-500"
              placeholder="vous@exemple.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white">
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-base text-white placeholder-slate-500 outline-none sm:text-sm focus:border-blue-500"
              placeholder="8 caractères minimum"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white btn-glow hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Déjà membre ?{" "}
        <Link
          href={packId ? `/login?callbackUrl=${encodeURIComponent(dashboardUrl)}` : "/login"}
          className="font-medium text-white underline underline-offset-2"
        >
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
