import { Star } from "lucide-react";

import { Flag } from "@/components/landing/flags";

/**
 * Avis clients RÉELS uniquement. La liste est vide tant qu'aucun avis n'a été
 * collecté : la section est alors masquée d'elle-même (voir Testimonials).
 *
 * Les anciens témoignages étaient rédigés, pas collectés. Publier des avis
 * fabriqués comme s'ils étaient authentiques est une pratique commerciale
 * trompeuse (code de la consommation, directive Omnibus), interdite aussi par
 * les règles publicitaires de Meta et TikTok.
 *
 * Pour ajouter un avis, recopiez-le fidèlement avec l'accord du client :
 *   { name: "Aminata K.", country: "Côte d'Ivoire", code: "CI", rating: 5, quote: "..." }
 */
interface Testimonial {
  /** Prénom + initiale, avec l'accord du client. */
  name: string;
  country: string;
  /** Code ISO du pays, pour le drapeau. */
  code: string;
  /** Note réellement donnée par le client, de 1 à 5. */
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="group relative mr-6 w-[320px] shrink-0 sm:w-[360px]">
      {/* Halo coloré posé derrière la carte et flouté : il déborde légèrement
          pour donner l'impression que la carte brille d'elle-même. */}
      <div
        aria-hidden
        className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-cyan-400/40 opacity-60 blur-md transition duration-500 group-hover:opacity-100 group-hover:blur-lg"
      />

      <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_40px_-12px_rgba(56,116,246,0.45)] backdrop-blur-xl transition duration-500 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-[0_12px_50px_-10px_rgba(56,116,246,0.7)]">
        <div className="flex items-center gap-1" aria-label={`Note : ${testimonial.rating} étoiles sur 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              aria-hidden
              className={`h-4 w-4 ${index < testimonial.rating ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
            />
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
  // Aucun avis réel pour l'instant : rien plutôt que de faux avis.
  if (TESTIMONIALS.length === 0) return null;

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
