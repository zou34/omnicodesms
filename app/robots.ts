import type { MetadataRoute } from "next";

// `||`, not `??` — see app/layout.tsx for why an empty string must also fall back.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated app surfaces and raw API routes have nothing useful
      // to index and shouldn't show up in search results.
      disallow: ["/dashboard", "/admin", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
