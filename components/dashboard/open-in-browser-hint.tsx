"use client";

import { Check, Copy, ExternalLink, Info } from "lucide-react";
import { useEffect, useState } from "react";

// Affiché dans la modale de recharge quand le client est dans le navigateur
// intégré d'une application (Facebook, Instagram, TikTok...), d'où arrive le
// trafic publicitaire. Constat du lancement (oct. 2026) : depuis ces
// navigateurs, la redirection vers l'application Wave échoue le plus
// souvent — le client n'y valide jamais le paiement et SasPay l'annule au
// bout de 30 min (11 échecs Wave sur 12). Dans Chrome ou Safari, Wave s'ouvre
// normalement.

/**
 * Lien qui ouvre la page dans Chrome depuis une WebView Android (Facebook,
 * Instagram...) : les liens `intent://` y sont confiés au système. Si Chrome
 * n'est pas installé, `browser_fallback_url` rouvre la page telle quelle.
 */
function chromeIntentUrl(url: URL): string {
  const fallback = encodeURIComponent(url.toString());
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

export function OpenInBrowserHint({ packId }: { packId: string | null }) {
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [targetUrl, setTargetUrl] = useState<URL | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other");
    // Le palier choisi suit le client : le dashboard rouvre la recharge dessus.
    const url = new URL("/dashboard", window.location.origin);
    if (packId) url.searchParams.set("pack", packId);
    setTargetUrl(url);
  }, [packId]);

  async function handleCopy() {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl.toString());
      setCopied(true);
    } catch {
      // Copie refusée par ce navigateur : le lien reste affiché, sélectionnable.
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
      <p className="flex items-start gap-2 font-semibold text-amber-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Vous payez avec Wave ? Ouvrez d&apos;abord le site dans votre navigateur.
      </p>
      <p className="mt-1.5 pl-6 text-xs leading-relaxed text-amber-100/80">
        Depuis l&apos;application Facebook ou Instagram, Wave ne s&apos;ouvre souvent pas pour valider le
        paiement. Dans {platform === "ios" ? "Safari" : "Chrome"}, tout fonctionne : reconnectez-vous puis
        rechargez. Les autres moyens de paiement restent proposés ici.
      </p>

      <div className="mt-3 flex flex-col gap-2 pl-6 sm:flex-row sm:items-center">
        {platform === "android" && targetUrl && (
          <a
            href={chromeIntentUrl(targetUrl)}
            className="btn-glow btn-glow-amber flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-400"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir dans Chrome
          </a>
        )}
        {platform === "ios" && (
          <p className="text-xs text-amber-100/90">
            Touchez <span className="font-semibold">⋯</span> en haut de l&apos;écran, puis{" "}
            <span className="font-semibold">« Ouvrir dans le navigateur externe »</span>.
          </p>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 px-4 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-500/10"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Lien copié" : "Copier le lien du site"}
        </button>
      </div>
    </div>
  );
}
