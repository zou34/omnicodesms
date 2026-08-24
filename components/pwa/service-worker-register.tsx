"use client";

import { useEffect } from "react";

// Mounted once in the root layout — registers public/sw.js so the PWA
// installability criteria (manifest + HTTPS + active service worker) are
// met regardless of which page the visitor lands on first.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[PWA] service worker registration failed", error);
    });
  }, []);

  return null;
}
