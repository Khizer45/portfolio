import type { NextConfig } from "next";

/** Where the Next.js server reaches the FastAPI backend (server-side only). */
const apiUrl = (process.env.API_URL || "http://localhost:8000").replace(/\/$/, "");
/** Set only if the browser calls the backend directly instead of through /api/v1. */
const publicApiOrigin = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : "";
const isDev = process.env.NODE_ENV !== "production";
/** Ask browsers to upgrade http:// subresources only when the site is served over HTTPS. */
const servedOverHttps =
  process.env.VERCEL === "1" || (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inlines small bootstrap scripts, and the theme script runs before paint.
  // Nonce-based CSP would force every page to render dynamically, losing static caching.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Project screenshots and certificates may be hosted on any HTTPS site.
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${publicApiOrigin ? ` ${publicApiOrigin}` : ""}${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(servedOverHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Cache Components is intentionally off: public pages use classic ISR (revalidate +
  // on-demand revalidation from the admin), which works with collections that may be
  // empty and with pages created after the build.
  cacheComponents: false,
  poweredByHeader: false,
  async rewrites() {
    // The browser talks only to this site. /api/v1/* is proxied to FastAPI, so the
    // session cookie is first-party and no cross-site cookies or CORS are needed.
    return [{ source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/admin", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
