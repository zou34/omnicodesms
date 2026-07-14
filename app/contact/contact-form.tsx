"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    // No backend endpoint yet — this simply confirms receipt client-side.
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSubmitting(false);
    setIsSent(true);
    setName("");
    setEmail("");
    setMessage("");
  }

  if (isSent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="text-lg font-semibold text-slate-900">Message envoyé !</p>
        <p className="text-sm text-slate-600">
          Merci de nous avoir contactés. Notre équipe vous répondra sous 24h.
        </p>
        <button
          type="button"
          onClick={() => setIsSent(false)}
          className="mt-2 text-sm font-medium text-blue-600 underline underline-offset-2"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
          Nom
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Jean Dupont"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="vous@exemple.com"
        />
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Comment pouvons-nous vous aider ?"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Envoyer le message
      </button>
    </form>
  );
}
