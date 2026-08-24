import type { MetadataRoute } from "next";

// Native App Router convention — auto-served at /manifest.webmanifest and
// auto-linked into every page's <head>, the same way app/robots.ts and
// app/sitemap.ts are already handled.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OmniCodeSMS",
    short_name: "OmniCodeSMS",
    description: "Numéros virtuels pour recevoir vos SMS de vérification, sans carte SIM.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#1e3a8a",
    lang: "fr",
    // SVG rather than PNG: Next 14.2.35's bundled next/og ImageResponse
    // crashes at module load (a confirmed upstream bug mixing a file://
    // URL with a plain path.join — reproduced on both Windows and POSIX
    // path handling), so PNGs couldn't be generated. Chrome/Edge/Android
    // (the browsers that actually support installation) accept SVG
    // manifest icons; swap these for real PNG exports once a proper
    // isolated logo asset is available (see public/logo.png).
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
