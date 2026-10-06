"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  MessageCircle,
  Music2,
  Send,
  ShieldCheck,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from "react";

import { Flag } from "@/components/landing/flags";

// Démonstration du parcours d'achat, étape par étape : chaque onglet montre
// dans un téléphone l'écran réel du dashboard correspondant (mêmes couleurs,
// mêmes libellés que components/dashboard/purchase-panel.tsx et
// active-orders.tsx). Le visiteur voit le produit avant de créer un compte.
//
// Les écrans sont dessinés en HTML/CSS plutôt qu'en captures : rien à
// télécharger en 3G, net sur tous les écrans, et toujours fidèle à
// l'interface. Le numéro affiché appartient à la plage 555-01xx, réservée
// à la fiction : il ne peut appartenir à personne.

const STEP_DURATION_MS = 6500;

// Durée de location réelle (lib/providers/GrizzlySmsProvider.ts) : le
// compte à rebours de la démo part juste en dessous, comme après l'achat.
const DEMO_RENTAL_S = 20 * 60;
const DEMO_CANCEL_AFTER_S = 2 * 60;
const DEMO_COUNTDOWN_START_S = DEMO_RENTAL_S - 8;

const STEPS = [
  {
    tab: "Étape 1",
    title: "Choisissez le pays et le service",
    description:
      "WhatsApp, Telegram, TikTok, Google… Sélectionnez le pays du numéro et l'application à valider. Le prix s'affiche avant l'achat, payé avec votre solde Mobile Money.",
    points: ["Plus de 100 pays disponibles", "Prix affiché avant de payer"],
  },
  {
    tab: "Étape 2",
    title: "Recevez votre numéro en quelques secondes",
    description:
      "Le numéro est réservé instantanément. Saisissez-le dans l'application et demandez le code de vérification.",
    points: ["Numéro attribué instantanément", "Pas de SMS ? Remboursement automatique et intégral"],
  },
  {
    tab: "Étape 3",
    title: "Copiez votre code",
    description:
      "Le code apparaît dans votre espace dès l'arrivée du SMS, mis en évidence. Un geste suffit pour le copier et valider votre compte.",
    points: ["Affichage en direct, sans recharger la page", "Copie du code en un clic"],
  },
] as const;

export function HowItWorks() {
  const [step, setStep] = useState(0);
  // Compteur d'activations par écran : sert de `key` pour rejouer ses
  // animations à chaque affichage, sans réinitialiser l'écran qui s'efface.
  const [activations, setActivations] = useState([0, 0, 0]);
  // Le défilement automatique s'arrête dès que le visiteur choisit une étape
  // lui-même : il a pris la main, on ne la lui reprend pas.
  const [autoplay, setAutoplay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartX = useRef<number | null>(null);

  // Hors de l'écran, la démo est en pause : elle reprend là où le visiteur
  // arrive, au lieu d'être déjà à l'étape 3 quand il la découvre.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const isPlaying = autoplay && isInView && !isHovered;

  function goTo(index: number) {
    const next = (index + STEPS.length) % STEPS.length;
    setStep(next);
    setActivations((prev) => prev.map((count, i) => (i === next ? count + 1 : count)));
  }

  function selectByUser(index: number) {
    setAutoplay(false);
    goTo(index);
  }

  // Navigation clavier des onglets (motif ARIA « tabs ») : flèches, Début, Fin.
  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, number> = {
      ArrowRight: step + 1,
      ArrowLeft: step - 1,
      Home: 0,
      End: STEPS.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + STEPS.length) % STEPS.length;
    selectByUser(next);
    tabRefs.current[next]?.focus();
  }

  function handleTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 40) return;
    selectByUser(deltaX < 0 ? step + 1 : step - 1);
  }

  const current = STEPS[step];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="scroll-mt-6 overflow-hidden bg-slate-50 px-6 py-20 sm:px-10 sm:py-24"
      onPointerEnter={(event) => event.pointerType === "mouse" && setIsHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setIsHovered(false)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Comment ça marche
          </span>
          <h2 className="text-balance mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Votre code SMS en 3 étapes
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Du choix du service jusqu&apos;au code de vérification, voici exactement ce que vous verrez dans
            votre espace.
          </p>
        </div>

        {/* Mobile : onglets, téléphone, puis explications — la démo est visible
            sans défiler. Desktop : onglets et explications à gauche, centrés sur
            le téléphone ; la hauteur minimale du texte évite que le bloc bouge d'une
            étape à l'autre. */}
        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-2 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-16 lg:gap-y-8">
          <div
            role="tablist"
            aria-label="Étapes du parcours"
            className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/70 p-1.5 lg:col-start-1 lg:row-start-2"
          >
            {STEPS.map((item, index) => {
              const isActive = index === step;
              return (
                <button
                  key={item.tab}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`how-step-tab-${index}`}
                  aria-selected={isActive}
                  aria-controls="how-step-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectByUser(index)}
                  onKeyDown={handleTabKeyDown}
                  className={`relative overflow-hidden rounded-xl px-2 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-base ${
                    isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.tab}
                  {/* Avancement vers l'étape suivante : sa fin déclenche le
                      passage automatique. Sans animation (réduction des
                      mouvements), il n'y a donc pas de défilement auto. */}
                  {isActive && (
                    <span aria-hidden className="absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full bg-blue-100">
                      {autoplay ? (
                        <span
                          key={`progress-${step}-${activations[step]}`}
                          className="block h-full origin-left animate-step-progress rounded-full bg-blue-600 motion-reduce:hidden"
                          style={{
                            animationDuration: `${STEP_DURATION_MS}ms`,
                            animationPlayState: isPlaying ? "running" : "paused",
                          }}
                          onAnimationEnd={() => goTo(step + 1)}
                        />
                      ) : (
                        <span className="block h-full rounded-full bg-blue-600" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="flex justify-center lg:col-start-2 lg:row-span-4 lg:row-start-1"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <DemoPhone>
              {STEPS.map((item, index) => {
                const isActive = index === step;
                return (
                  <div
                    key={item.tab}
                    aria-hidden
                    className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
                      isActive ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    <div key={activations[index]} className="h-full">
                      {index === 0 && <ChooseScreen />}
                      {index === 1 && <NumberScreen running={isActive && isInView} />}
                      {index === 2 && <CodeScreen />}
                    </div>
                  </div>
                );
              })}
            </DemoPhone>
          </div>

          <div className="flex flex-col lg:col-start-1 lg:row-start-3 lg:min-h-[23rem]">
            <div
              key={`panel-${step}`}
              role="tabpanel"
              id="how-step-panel"
              aria-labelledby={`how-step-tab-${step}`}
              className="flex-1 animate-fade-up motion-reduce:animate-none"
            >
              <p className="text-sm font-semibold text-blue-600">
                Étape {step + 1} sur {STEPS.length}
              </p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {current.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{current.description}</p>
              <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6">
                {current.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm font-medium text-slate-700 sm:text-base">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sur mobile, la barre d'action fixe en bas de page joue déjà ce rôle. */}
            <Link
              href="/register"
              className="btn-glow mt-10 hidden items-center gap-2 self-start rounded-full bg-blue-600 px-7 py-3.5 text-base font-bold text-white hover:bg-blue-500 lg:inline-flex"
            >
              Essayer maintenant
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Cadre de téléphone : même facture que components/landing/phone-showcase.tsx. */
function DemoPhone({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-10 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="relative h-[540px] w-[270px] rounded-[3rem] border-[10px] border-slate-900 bg-slate-950 shadow-2xl shadow-blue-900/30 sm:h-[600px] sm:w-[300px]">
        <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-1 overflow-hidden rounded-[2.4rem] bg-slate-950 text-white">
          <div className="absolute inset-0 flex flex-col px-3.5 pb-4 pt-10">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-extrabold tracking-tight">FlashCodeSMS</span>
              <span className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                <Wallet className="h-3 w-3 text-blue-400" />
                2 500 FCFA
              </span>
            </div>
            <div className="relative flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_SERVICES = [
  { name: "WhatsApp", icon: MessageCircle, color: "bg-emerald-500" },
  { name: "Telegram", icon: Send, color: "bg-sky-500" },
  { name: "TikTok", icon: Music2, color: "bg-slate-700" },
] as const;

function ChooseScreen() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-sm font-semibold">Louer un numéro</p>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400">Choisissez un pays et un service.</p>

      <p className="mt-3 text-[10px] text-slate-300">Pays</p>
      <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-2">
        <span className="flex items-center gap-2 text-xs">
          <Flag code="US" className="h-3 w-[18px] shrink-0 rounded-[2px]" />
          États-Unis (US)
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </div>

      <p className="mt-3 text-[10px] text-slate-300">Service</p>
      <div className="mt-1 space-y-1.5">
        {DEMO_SERVICES.map(({ name, icon: Icon, color }, index) => {
          const isSelected = index === 0;
          return (
            <div
              key={name}
              style={{ animationDelay: `${150 + index * 120}ms` }}
              className={`flex animate-fade-up items-center justify-between rounded-lg border px-2.5 py-2 motion-reduce:animate-none ${
                isSelected ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-950/50"
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${color}`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </span>
                {name}
              </span>
              {isSelected && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto">
        <div className="relative">
          <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold shadow-lg shadow-blue-600/30">
            <ShoppingCart className="h-3.5 w-3.5" />
            Acheter ce numéro
          </span>
          {/* Appui simulé sur le bouton. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -ml-5 -mt-5 h-10 w-10 animate-tap rounded-full bg-white/60 opacity-0 [animation-delay:1.4s] motion-reduce:hidden"
          />
        </div>
      </div>
    </div>
  );
}

function NumberScreen({ running }: { running: boolean }) {
  const [secondsLeft, setSecondsLeft] = useState(DEMO_COUNTDOWN_START_S);

  useEffect(() => {
    if (!running) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // Comme dans le dashboard : l'annulation n'est possible que 2 minutes
  // après l'achat (CANCEL_AVAILABLE_AFTER_MS, active-orders.tsx).
  const cancelInS = Math.max(0, secondsLeft - (DEMO_RENTAL_S - DEMO_CANCEL_AFTER_S));

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[10px] text-slate-400">États-Unis (US) · WhatsApp</p>
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-400">
            <Clock className="h-2.5 w-2.5" />
            En attente
          </span>
        </div>
        <div className="mt-2 flex animate-fade-up items-center justify-between gap-2 motion-reduce:animate-none">
          <span className="font-mono text-[15px] tracking-tight">+1 628 555 0147</span>
          <span className="flex items-center gap-1 rounded-md border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300">
            <Copy className="h-2.5 w-2.5" />
            Copier
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-medium text-amber-300">
            <Clock className="h-3 w-3 animate-pulse motion-reduce:animate-none" />
            En attente du SMS...
          </span>
          <span className="text-right">
            <span className="block whitespace-nowrap text-[8px] font-medium uppercase tracking-wide text-amber-400/80">
              Restant
            </span>
            <span className="block font-mono text-lg font-bold tabular-nums leading-tight text-amber-300">
              {formatDemoCountdown(secondsLeft)}
            </span>
          </span>
        </div>
      </div>

      <div
        style={{ animationDelay: "400ms" }}
        className="flex animate-fade-up items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 motion-reduce:animate-none"
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <p className="text-[11px] font-semibold text-emerald-300">Remboursement garanti</p>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-300">
            Aucun SMS reçu ? La commande est annulée et vous êtes intégralement remboursé.
          </p>
        </div>
      </div>

      <div
        style={{ animationDelay: "700ms" }}
        className="animate-fade-up rounded-2xl border border-slate-800 bg-slate-900/60 p-3 motion-reduce:animate-none"
      >
        <p className="text-[10px] leading-snug text-slate-400">
          Saisissez ce numéro dans <span className="font-semibold text-white">WhatsApp</span> puis demandez
          le code : il s&apos;affichera ici automatiquement.
        </p>
      </div>

      <span className="mt-auto flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 py-2.5 text-[11px] font-semibold tabular-nums text-slate-500">
        {cancelInS > 0
          ? `Annulation possible dans ${formatDemoCountdown(cancelInS)}`
          : "Pas de SMS ? Annuler et être remboursé"}
      </span>
    </div>
  );
}

function formatDemoCountdown(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

// Commandes précédentes sous la commande en cours, comme la liste des
// numéros du dashboard. Codes d'exemple.
const DEMO_HISTORY = [
  { label: "France (FR) · Telegram", flag: "FR", code: "72918" },
  { label: "Côte d'Ivoire (CI) · TikTok", flag: "CI", code: "605114" },
] as const;

function CodeScreen() {
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[10px] text-slate-400">États-Unis (US) · WhatsApp</p>
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Reçu
          </span>
        </div>
        <p className="mt-2 font-mono text-[15px] tracking-tight">+1 628 555 0147</p>

        <div
          style={{ animationDelay: "300ms" }}
          className="mt-3 flex animate-fade-up items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-2 ring-1 ring-emerald-500/30 motion-reduce:animate-none"
        >
          <div>
            <p className="text-[10px] text-emerald-400">Code reçu</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-emerald-300">482913</p>
          </div>
          <span className="relative grid shrink-0 place-items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-emerald-950">
            <span className="col-start-1 row-start-1 animate-fade-out [animation-delay:2s] motion-reduce:animate-none">
              Copier
            </span>
            <span className="col-start-1 row-start-1 animate-fade-up opacity-0 [animation-delay:2s] motion-reduce:hidden">
              Copié !
            </span>
          </span>
        </div>
      </div>

      <div
        style={{ animationDelay: "1000ms" }}
        className="flex animate-fade-up items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 motion-reduce:animate-none"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-[10px] leading-snug text-slate-300">
          Collez le code dans WhatsApp : votre compte est validé.
        </p>
      </div>

      <div style={{ animationDelay: "1400ms" }} className="animate-fade-up motion-reduce:animate-none">
        <p className="mb-1.5 mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Historique
        </p>
        <div className="space-y-1.5">
          {DEMO_HISTORY.map((order) => (
            <div
              key={order.label}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-2.5 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Flag code={order.flag} className="h-2.5 w-4 shrink-0 rounded-[2px]" />
                <span className="truncate text-[10px] text-slate-400">{order.label}</span>
              </span>
              <span className="shrink-0 font-mono text-[11px] font-semibold text-emerald-300">{order.code}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
