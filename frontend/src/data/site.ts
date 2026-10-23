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
  title: "Khizer Hayat — Software Engineer",
  description:
    "Portfolio of Khizer Hayat, a Software Engineering graduate building practical AI systems, backend services, and machine learning applications with Python, FastAPI, and Docker.",
  /** Theme used on a first visit, before a visitor picks one. */
  defaultTheme: "dark" as "dark" | "light",
  /**
   * Show categories that have no projects yet (as "Projects coming soon") in
   * the category directory. Set to false to only list active categories.
   */
  showEmptyCategories: true,
};

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Skills", href: "/skills" },
  { label: "Experience", href: "/experience" },
  { label: "Certifications", href: "/certifications" },
  { label: "About", href: "/about" },
  { label: "Writing", href: "/writing" },
  { label: "Contact", href: "/contact" },
] as const;
