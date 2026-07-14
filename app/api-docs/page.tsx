import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Documentation API — OmniCodeSMS",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="prose prose-slate">
          <h1>Documentation API</h1>
          <p>
            L&apos;API OmniCodeSMS vous permet de louer des numéros virtuels et de récupérer les
            codes SMS reçus directement depuis votre propre application, sans passer par le
            tableau de bord.
          </p>
          <h2>Authentification</h2>
          <p>
            Chaque requête doit inclure votre clé API personnelle dans l&apos;en-tête{" "}
            <code>Authorization</code>.
          </p>
          <h2>Louer un numéro</h2>
          <p>
            Exemple de requête <code>GET</code> pour obtenir un numéro virtuel WhatsApp aux
            États-Unis :
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-slate-950 shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed">
            <code className="font-mono text-emerald-400">
              {`curl -X GET "https://api.omnicodesms.com/v1/numbers?country=US&service=whatsapp" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            </code>
          </pre>
        </div>

        <div className="prose prose-slate mt-8">
          <p>Réponse type :</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-slate-950 shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed">
            <code className="font-mono text-slate-300">
              {`{
  "id": "ord_7f3a9c",
  "phoneNumber": "+15551234567",
  "country": "US",
  "service": "whatsapp",
  "status": "PENDING",
  "price": 100,
  "currency": "FCFA"
}`}
            </code>
          </pre>
        </div>

        <div className="prose prose-slate mt-8">
          <p className="text-sm text-slate-500">
            🚧 Documentation complète (webhooks, annulation, historique) bientôt disponible.
          </p>
        </div>
      </div>
    </div>
  );
}
