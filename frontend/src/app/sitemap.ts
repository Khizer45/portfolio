import type { MetadataRoute } from "next";

import { getCategories, getNavigation, getProjects, getPublishedArticles } from "@/lib/content";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 300;

/** Public pages only. The admin dashboard (/admin) is never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [navigation, projects, categories, articles] = await Promise.all([
    getNavigation(),
    getProjects(),
    getCategories(),
    getPublishedArticles(),
  ]);
  // The same pages as the menu, so sections with nothing to show yet aren't indexed.
  const pages = navigation.map((item) => (item.href === "/" ? "" : item.href));

  return [
    ...pages.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : path === "/projects" ? 0.9 : 0.7,
    })),
    ...projects.map((project) => ({
      url: `${base}/projects/${project.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Only categories with projects; empty ones are still reachable but not worth indexing.
    ...categories
      .filter((category) => category.project_count > 0)
      .map((category) => ({
        url: `${base}/projects/category/${category.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    // External articles live on another site and have no page here.
    ...articles
      .filter((article) => !article.external_url)
      .map((article) => ({
        url: `${base}/writing/${article.slug}`,
        lastModified: article.updated_at,
        changeFrequency: "yearly" as const,
        priority: 0.6,
      })),
  ];
}
