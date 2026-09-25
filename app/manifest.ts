import type { MetadataRoute } from "next";

// Native App Router convention — auto-served at /manifest.webmanifest and
// auto-linked into every page's <head>, the same way app/robots.ts and
// app/sitemap.ts are already handled.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlashCodeSMS",
    short_name: "FlashCodeSMS",
    description: "Numéros virtuels pour recevoir vos SMS de vérification, sans carte SIM.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "fr",
    // SVG pour les navigateurs qui l'acceptent, PNG pour tous les autres
    // (rendus depuis app/icon.svg, le logo de référence).
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
