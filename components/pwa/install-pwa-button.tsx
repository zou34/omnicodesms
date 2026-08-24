"use client";

import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

// Not part of the DOM lib's type definitions yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPwaButtonProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Renders nothing until the browser actually fires `beforeinstallprompt` —
 * never a dead/no-op button. That event only exists on Chromium-based
 * browsers (Chrome, Edge, Samsung Internet, ...) once installability
 * criteria are met (valid manifest, HTTPS, active service worker); Safari/
 * iOS never fires it at all (they use their own manual "Add to Home
 * Screen" flow instead), so this button simply won't appear there.
 * Also hides once the app is already running standalone (installed), or
 * right after a successful install.
 */
export function InstallPwaButton({ className, children }: InstallPwaButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    function handleBeforeInstallPrompt(event: Event) {
      // Stops Chrome's default mini-infobar so the click is the only
      // trigger — keeps this fully under our own UI's control.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled || !deferredPrompt) return null;

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Chrome only ever fires beforeinstallprompt once per prompt instance —
    // discard it either way (accepted or dismissed) rather than trying to
    // reuse a spent event.
    setDeferredPrompt(null);
  }

  return (
    <button type="button" onClick={handleInstallClick} className={className} aria-label="Installer l'application">
      <Download className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}
