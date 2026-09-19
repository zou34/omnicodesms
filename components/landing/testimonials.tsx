import { Star } from "lucide-react";

import { Flag } from "@/components/landing/flags";

/**
 * ⚠️ CONTENU D'ILLUSTRATION — À REMPLACER AVANT L'OUVERTURE COMMERCIALE.
 *
 * Ces témoignages sont rédigés, pas collectés : aucun ne provient d'un client
 * réel. Publier des avis fabriqués comme s'ils étaient authentiques est une
 * pratique commerciale trompeuse, sanctionnée dans l'UE (directive Omnibus)
 * comme aux États-Unis (règle FTC sur les faux avis).
 *
 * Remplacez chaque entrée par un avis réellement reçu dès que vous en avez :
 * seul ce tableau change, la structure et le design restent identiques.
 */
const TESTIMONIALS = [
  {
    name: "Aminata",
    country: "Côte d'Ivoire",
    code: "CI",
    quote:
      "J'ai créé mon compte WhatsApp Business en moins de deux minutes. Le code est arrivé avant même que je rafraîchisse la page.",
  },
  {
    name: "Thomas",
    country: "France",
    code: "FR",
    quote:
      "Je vends sur Vinted et j'avais besoin d'un second numéro. Tout a fonctionné du premier coup, sans carte SIM.",
  },
  {
    name: "Sarah",
    country: "Maroc",
    code: "MA",
    quote:
      "Inscription à OpenAI réussie alors que mon opérateur était refusé depuis des semaines. J'ai enfin accès à ChatGPT.",
  },
  {
    name: "David",
    country: "USA",
    code: "US",
    quote:
      "I needed a second Telegram account for work. Paid, got the number, received the code. Under a minute, no questions asked.",
  },
  {
    name: "Koffi",
    country: "Togo",
    code: "TG",
    quote:
      "Le paiement par Moov Money change tout. Pas besoin de carte bancaire internationale, je recharge et j'achète directement.",
  },
  {
    name: "Emily",
    country: "Royaume-Uni",
    code: "GB",
    quote:
      "Used it for Tinder verification while travelling. The number worked instantly and I kept my personal one private.",
  },
  {
    name: "Moussa",
    country: "Sénégal",
    code: "SN",
    quote:
      "Un SMS n'est jamais arrivé, et j'ai été remboursé automatiquement sans rien demander. C'est ça qui m'a convaincu de rester.",
  },
  {
    name: "Chloé",
    country: "Belgique",
    code: "BE",
    quote:
      "Deuxième compte Instagram créé sans utiliser mon vrai numéro. L'interface est claire, on comprend tout de suite quoi faire.",
  },
  {
    name: "Ibrahim",
    country: "Nigeria",
    code: "NG",
    quote:
      "I manage several Discord communities. Getting a fresh number per account used to be a nightmare — now it takes seconds.",
  },
  {
    name: "Fatou",
    country: "Mali",
    code: "ML",
    quote:
      "Les prix sont affichés en FCFA, sans conversion surprise à la fin. Je sais exactement ce que je paie avant de cliquer.",
  },
  {
    name: "Lucas",
    country: "Canada",
    code: "CA",
    quote:
      "Vérification Google réussie du premier essai. J'avais essayé deux autres services avant, aucun ne livrait le code.",
  },
  {
    name: "Nadia",
    country: "Algérie",
    code: "DZ",
    quote:
      "J'ai pu ouvrir un compte TikTok professionnel avec un numéro étranger. Le code arrive directement dans le tableau de bord.",
  },
  {
    name: "Jean-Paul",
    country: "Cameroun",
    code: "CM",
    quote:
      "Le choix de pays est impressionnant. J'ai trouvé exactement le numéro qu'il me fallait pour mon inscription Facebook.",
  },
  {
    name: "Awa",
    country: "Burkina Faso",
    code: "BF",
    quote:
      "Recharge par Orange Money créditée instantanément. J'ai enchaîné trois vérifications dans la foulée sans aucun blocage.",
  },
  {
    name: "Marc",
    country: "Gabon",
    code: "GA",
    quote:
      "Interface en français, support réactif, et surtout un numéro qui fonctionne vraiment. Je recommande sans hésiter.",
  },
] as const;

function TestimonialCard({ testimonial }: { testimonial: (typeof TESTIMONIALS)[number] }) {
  return (
    <figure className="group relative mr-6 w-[320px] shrink-0 sm:w-[360px]">
      {/* Halo coloré posé derrière la carte et flouté : il déborde légèrement
          pour donner l'impression que la carte brille d'elle-même. */}
      <div
        aria-hidden
        className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-cyan-400/40 opacity-60 blur-md transition duration-500 group-hover:opacity-100 group-hover:blur-lg"
      />

      <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_40px_-12px_rgba(56,116,246,0.45)] backdrop-blur-xl transition duration-500 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-[0_12px_50px_-10px_rgba(56,116,246,0.7)]">
        <div className="flex items-center gap-1" aria-label="Note : 5 étoiles sur 5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} aria-hidden className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>

        <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-200">
          &laquo;&nbsp;{testimonial.quote}&nbsp;&raquo;
        </blockquote>

        <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
          {/* Le liseré clair détache les drapeaux très clairs (Belgique, Maroc)
              du fond sombre de la carte. */}
          <Flag
            code={testimonial.code}
            className="h-6 w-9 shrink-0 rounded-[3px] shadow-sm ring-1 ring-inset ring-white/25"
          />
          <span className="text-sm">
            <span className="block font-semibold text-white">{testimonial.name}</span>
            <span className="block text-xs text-slate-400">{testimonial.country}</span>
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-24">
      {/* Nappes de lumière diffuses, purement décoratives. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]"
      />

      <div className="relative mx-auto max-w-6xl px-6 text-center sm:px-10">
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-blue-300 backdrop-blur">
          Ils utilisent FlashCodeSMS
        </span>

        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Des vérifications réussies, partout dans le monde
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          WhatsApp, Telegram, Vinted, OpenAI, Tinder — nos utilisateurs débloquent leurs
          inscriptions en quelques secondes.
        </p>
      </div>

      {/* Le dégradé latéral fait disparaître les cartes en douceur sur les bords
          plutôt que de les couper net. Sans animation (préférence système), la
          piste redevient un simple rail défilable à la main. */}
      <div className="relative mt-16 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}

          {/* Seconde copie : c'est elle qui rend la boucle continue. Masquée aux
              lecteurs d'écran, qui ne doivent entendre chaque avis qu'une fois. */}
          <div aria-hidden className="flex">
            {TESTIMONIALS.map((testimonial) => (
              <TestimonialCard key={`duplicate-${testimonial.name}`} testimonial={testimonial} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
