import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Public, crawlable routes only — /dashboard and /admin are excluded here
// the same way they're excluded in app/robots.ts.
const PUBLIC_ROUTES = ["", "/about", "/contact", "/privacy", "/terms", "/api-docs", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${APP_URL}${route}`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
