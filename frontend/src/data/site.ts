/**
 * Site-wide settings that rarely change. All portfolio content (profile, projects,
 * skills, …) is managed in the admin dashboard at /admin.
 */
export const site = {
  /** Name used in page titles and search results. */
  ownerName: "Khizer Hayat",
  /**
   * Public URL, used for the sitemap and social previews. Leave empty to use
   * the Vercel production URL automatically. Set it if you add a custom
   * domain, e.g. "https://khizerhayat.dev".
   */
  url: "",
  title: "Khizer Hayat — Software Engineer (AI/ML)",
  description:
    "Khizer Hayat — Software Engineer focused on AI/ML and MLOps. Projects in computer vision, LLM applications, and Python backend services with FastAPI.",
  /** Theme used on a first visit, before a visitor picks one. */
  defaultTheme: "dark" as "dark" | "light",
  /**
   * Show categories that have no projects yet (as "Projects coming soon") in
   * the category directory. Set to false to only list active categories.
   */
  showEmptyCategories: true,
};

/**
 * Main navigation. Items with `requires` are only shown once that content exists,
 * so visitors never land on an empty page from the menu (the routes still work).
 */
export const navigation: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Skills", href: "/skills" },
  { label: "Experience", href: "/experience" },
  { label: "Education", href: "/education" },
  { label: "Certifications", href: "/certifications", requires: "certifications" },
  { label: "About", href: "/about" },
  { label: "Writing", href: "/writing", requires: "articles" },
  { label: "Contact", href: "/contact" },
];

export type NavItem = { label: string; href: string; requires?: "certifications" | "articles" };
