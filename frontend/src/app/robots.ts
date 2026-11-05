import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    // The admin isn't listed here, so robots.txt doesn't reveal where it is; its pages send
    // noindex (meta tag and X-Robots-Tag header) instead.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
