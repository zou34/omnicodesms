"use client";

import { useEffect, useState } from "react";

import { LogoMark } from "@/components/brand/logo-mark";

// Durée totale de la séquence (voir .splash-* dans app/globals.css) :
// logo (0 s) -> nom (0,7 s) -> fondu de sortie (1,9 s -> 2,4 s).
const SPLASH_DURATION_MS = 2400;
const SEEN_KEY = "flashcodesms:splash-seen";

/**
 * Écran d'introduction de la page d'accueil, une fois par session.
 *
 * Toute la séquence est en CSS pur : même si le JavaScript tarde ou échoue,
 * l'écran s'efface de lui-même et ne bloque jamais la page. Le JS ne sert
 * qu'à le retirer du DOM ensuite, et à l'éviter aux visites suivantes (un
 * visiteur qui revient d'une autre page n'a pas à le revoir).
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée stricte) : on joue l'intro.
    }

    if (seen) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-screen" role="presentation" aria-hidden="true">
      <div className="splash-glow" />
      <LogoMark className="splash-logo h-24 w-24 sm:h-28 sm:w-28" />
      <p className="splash-title mt-6 text-4xl font-black tracking-tight sm:text-6xl">
        <span className="text-white">FlashCode</span>
        <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">SMS</span>
      </p>
    </div>
  );
}
