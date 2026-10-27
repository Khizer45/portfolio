/**
 * Types for the FastAPI backend (`/api/v1`). They mirror the Pydantic schemas in
 * `backend/app/schemas/`. If you change a schema there, update the matching type here.
 */

/* -------------------------------------------------------------------------- */
/* Enumerations                                                               */
/* -------------------------------------------------------------------------- */

export type ProjectStatus = "planned" | "in_progress" | "prototype" | "completed" | "deployed";
export type FeatureStatus = "implemented" | "in_progress" | "planned";
export type ImageKind = "screenshot" | "diagram";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "internship"
  | "freelance"
  | "contract"
  | "volunteer"
  | "open_source";
export type WorkMode = "on_site" | "remote" | "hybrid";
export type AchievementType = "award" | "achievement" | "scholarship" | "competition" | "publication";
export type ArticleStatus = "draft" | "published";
export type CategoryIcon =
  | "layout"
  | "server"
  | "layers"
  | "chart"
  | "brain"
  | "network"
  | "eye"
  | "message"
  | "sparkles"
  | "workflow"
  | "container"
  | "cpu"
  | "terminal";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/* -------------------------------------------------------------------------- */
/* Public                                                                     */
/* -------------------------------------------------------------------------- */

export interface SocialLink {
  label: string;
  url: string;
}

export interface Profile {
  display_name: string;
  role: string;
  headline: string;
  intro: string;
  biography: string;
  location: string;
  contact_email: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  cv_url: string | null;
  profile_image_url: string | null;
  social_links: SocialLink[];
  /** Extra menu links added in Admin → Profile: a "/path" on this site or a full URL. */
  nav_links: SocialLink[];
  footer_text: string;
  availability_open: boolean;
  availability_label: string;
  focus_areas: string[];
  spoken_languages: string[];
  career_interests: string[];
  interests: string[];
  approach: string[];
  seeking: string[];
  updated_at: string;
}

export interface CategoryRef {
  slug: string;
  title: string;
  short_title: string;
  icon: CategoryIcon;
}

export interface Category extends CategoryRef {
  description: string;
  focus_areas: string[];
  project_count: number;
}

export interface ProjectImage {
  url: string;
  alt: string;
  caption: string | null;
  kind: ImageKind;
  width: number | null;
  height: number | null;
}

export interface ProjectFeature {
  name: string;
  status: FeatureStatus;
  description: string | null;
}

export interface ProjectDecision {
  title: string;
  detail: string;
}

export interface ProjectMetric {
  label: string;
  value: string;
  context: string | null;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string;
  label: string | null;
  status: ProjectStatus;
  is_featured: boolean;
  technologies: string[];
  category: CategoryRef;
  categories: CategoryRef[];
  cover_image: ProjectImage | null;
  start_date: string | null;
  end_date: string | null;
}

export interface RelatedArticle {
  slug: string;
  title: string;
  published_at: string | null;
  external_url: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  subcategory: string | null;
  role: string | null;
  problem: string | null;
  architecture: string | null;
  contribution: string[];
  implementation: string[];
  challenges: string[];
  lessons: string[];
  next_steps: string[];
  features: ProjectFeature[];
  decisions: ProjectDecision[];
  results: ProjectMetric[];
  images: ProjectImage[];
  evaluation_note: string | null;
  notice_title: string | null;
  notice_body: string | null;
  github_url: string | null;
  demo_url: string | null;
  docs_url: string | null;
  video_url: string | null;
  related_articles: RelatedArticle[];
}

export interface Technology {
  name: string;
  slug: string;
  project_count: number;
}

export interface ProjectRef {
  slug: string;
  title: string;
}

export interface Skill {
  name: string;
  level: SkillLevel;
  description: string | null;
  is_learning: boolean;
  is_featured: boolean;
  evidence_project: ProjectRef | null;
}

export interface SkillGroup {
  slug: string;
  title: string;
  description: string | null;
  skills: Skill[];
}

export interface Experience {
  id: string;
  organization: string;
  organization_url: string | null;
  role: string;
  employment_type: EmploymentType;
  location: string;
  work_mode: WorkMode | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
  link_label: string | null;
  link_url: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiration_date: string | null;
  credential_id: string | null;
  verification_url: string | null;
  file_url: string | null;
  related_skills: string[];
  description: string | null;
}

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  field_of_study: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  grade: string | null;
  description: string | null;
  highlights: string[];
  coursework: string[];
  is_primary: boolean;
}

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  issuer: string;
  date: string;
  description: string | null;
  url: string | null;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  external_url: string | null;
  related_project: ProjectRef | null;
  published_at: string | null;
  updated_at: string;
  reading_minutes: number;
}

export interface Article extends ArticleSummary {
  content: string;
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  last_login_at: string | null;
}

export interface SessionInfo {
  user: AdminUser;
  csrf_token: string;
  expires_at: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  actor: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardStats {
  projects_published: number;
  projects_draft: number;
  projects_featured: number;
  skills: number;
  skills_hidden: number;
  experiences: number;
  certifications: number;
  education: number;
  achievements: number;
  articles_published: number;
  articles_draft: number;
  recent_changes: AuditEntry[];
}

/** Any admin record: an object with an id plus resource-specific fields. */
export type AdminRecord = { id: string } & Record<string, unknown>;
