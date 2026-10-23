/**
 * Public portfolio content, loaded from the backend API.
 *
 * All content is managed in the admin dashboard (/admin) and stored in PostgreSQL.
 * The API only returns published / visible records, so nothing here needs to filter
 * drafts. Server-only: do not import from client components.
 */
import fs from "node:fs";
import path from "node:path";

import { apiGet, apiGetOrNull } from "@/lib/api/server";
import type {
  Achievement,
  AchievementType,
  Article,
  ArticleSummary,
  Category,
  Certification,
  Education,
  Experience,
  Page,
  Profile,
  ProjectDetail,
  ProjectSummary,
  SkillGroup,
  Technology,
} from "@/types/api";

/** Shown if the profile has never been saved (e.g. a fresh database). */
export const FALLBACK_PROFILE: Profile = {
  display_name: "Portfolio",
  role: "",
  headline: "This portfolio is being set up.",
  intro: "",
  biography: "",
  location: "",
  contact_email: null,
  github_url: null,
  linkedin_url: null,
  cv_url: null,
  profile_image_url: null,
  social_links: [],
  availability_open: false,
  availability_label: "",
  focus_areas: [],
  spoken_languages: [],
  career_interests: [],
  interests: [],
  approach: [],
  seeking: [],
  updated_at: new Date(0).toISOString(),
};

const EMPTY_PAGE = { items: [], total: 0, page: 1, page_size: 100, pages: 1 };

export async function getProfile(): Promise<Profile> {
  return (await apiGetOrNull<Profile>("/profile")) ?? FALLBACK_PROFILE;
}

/** Biography text split into paragraphs (separated by blank lines). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * The CV link, or null when none is configured. Site-relative paths (e.g.
 * "/cv/Khizer-Hayat-CV.pdf") are checked against `public/` so a missing file never
 * produces a broken button. A malformed path, or one that resolves outside `public/`,
 * counts as no CV: this runs in the layout of every public page, so it must never throw.
 */
export function cvLink(profile: Profile): string | null {
  const url = profile.cv_url;
  if (!url) return null;
  if (!url.startsWith("/")) return url;
  if (/^\/[/\\]/.test(url)) return null; // "//host" or "/\host" would leave the site
  try {
    const publicDir = path.join(process.cwd(), "public");
    const file = path.join(publicDir, decodeURIComponent(url));
    const relative = path.relative(publicDir, file);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ? url : null;
  } catch {
    return null;
  }
}

/* Projects & categories --------------------------------------------------- */

export async function getProjects(): Promise<ProjectSummary[]> {
  const page = await apiGet<Page<ProjectSummary>>("/projects?page_size=100", EMPTY_PAGE);
  return page.items;
}

export async function getFeaturedProjects(): Promise<ProjectSummary[]> {
  return (await getProjects()).filter((p) => p.is_featured);
}

export async function getProject(slug: string): Promise<ProjectDetail | null> {
  return apiGetOrNull<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`);
}

export async function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/project-categories", []);
}

export async function getTechnologies(): Promise<Technology[]> {
  return apiGet<Technology[]>("/technologies", []);
}

export async function getProjectsInCategory(slug: string): Promise<ProjectSummary[]> {
  const page = await apiGet<Page<ProjectSummary>>(
    `/projects?page_size=100&category=${encodeURIComponent(slug)}`,
    EMPTY_PAGE,
  );
  return page.items;
}

/* Skills, experience, credentials ----------------------------------------- */

export async function getSkillGroups(options: { featuredOnly?: boolean } = {}): Promise<SkillGroup[]> {
  const groups = await apiGet<SkillGroup[]>("/skills", []);
  if (!options.featuredOnly) return groups;
  return groups
    .map((group) => ({ ...group, skills: group.skills.filter((s) => s.is_featured) }))
    .filter((group) => group.skills.length > 0);
}

export async function getExperience(): Promise<Experience[]> {
  return apiGet<Experience[]>("/experiences", []);
}

export async function getEducation(): Promise<Education[]> {
  return apiGet<Education[]>("/education", []);
}

export async function getPrimaryEducation(): Promise<Education | undefined> {
  const education = await getEducation();
  return education.find((e) => e.is_primary) ?? education[0];
}

export async function getCertifications(): Promise<Certification[]> {
  return apiGet<Certification[]>("/certifications", []);
}

const ACHIEVEMENT_ORDER: AchievementType[] = ["award", "achievement", "scholarship", "competition", "publication"];

export async function getAchievementGroups(): Promise<Array<{ type: AchievementType; items: Achievement[] }>> {
  const items = await apiGet<Achievement[]>("/achievements", []);
  return ACHIEVEMENT_ORDER.map((type) => ({ type, items: items.filter((a) => a.type === type) })).filter(
    (group) => group.items.length > 0,
  );
}

/* Writing ------------------------------------------------------------------ */

export async function getPublishedArticles(): Promise<ArticleSummary[]> {
  const page = await apiGet<Page<ArticleSummary>>("/articles?page_size=50", { ...EMPTY_PAGE, page_size: 50 });
  return page.items;
}

export async function getArticle(slug: string): Promise<Article | null> {
  return apiGetOrNull<Article>(`/articles/${encodeURIComponent(slug)}`);
}
