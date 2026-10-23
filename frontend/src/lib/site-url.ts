import { site } from "@/data/site";

/**
 * Absolute site URL for metadata, the sitemap, and robots.txt.
 * Priority: `site.url` → NEXT_PUBLIC_SITE_URL → Vercel production URL → localhost.
 */
export function getSiteUrl(): string {
  const url =
    site.url ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}
