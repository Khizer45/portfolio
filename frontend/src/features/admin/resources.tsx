/**
 * Admin resources: everything the generic list and form screens need to manage one
 * kind of content. To add a field, add it to the matching section below (and to the
 * backend schema); the form, validation, and payload follow automatically.
 */
import { StatusBadge } from "@/components/ui/badge";
import type { FieldDef, FormSection, Option } from "@/features/admin/form/types";
import { StateBadge } from "@/features/admin/ui";
import { formatMonth, formatRange } from "@/lib/format";
import {
  achievementTypeMeta,
  employmentTypeLabel,
  featureStatusMeta,
  projectStatusMeta,
  workModeLabel,
} from "@/lib/labels";
import type { AdminRecord } from "@/types/api";

export type Column = {
  label: string;
  render: (item: AdminRecord) => React.ReactNode;
  /** Hidden on small screens. */
  secondary?: boolean;
};

export type Toggle = {
  label: string;
  isOn: (item: AdminRecord) => boolean;
  /** PATCH body that switches the toggle to `next`. */
  body: (next: boolean) => Record<string, unknown>;
  onText: string;
  offText: string;
};

export type ResourceDef = {
  key: string;
  endpoint: string;
  title: string;
  singular: string;
  description: string;
  sections: FormSection[];
  columns: Column[];
  titleOf: (item: AdminRecord) => string;
  subtitleOf?: (item: AdminRecord) => string | null;
  toggles?: Toggle[];
  reorderable?: boolean;
  publicHref?: (item: AdminRecord) => string | null;
  filters?: Array<{ param: string; label: string; options: Option[] }>;
};

const opts = (record: Record<string, string>): Option[] =>
  Object.entries(record).map(([value, label]) => ({ value, label }));

const statusOptions = opts(Object.fromEntries(Object.entries(projectStatusMeta).map(([k, v]) => [k, v.label])));
const featureOptions = opts(Object.fromEntries(Object.entries(featureStatusMeta).map(([k, v]) => [k, v.label])));
const achievementOptions = opts(Object.fromEntries(Object.entries(achievementTypeMeta).map(([k, v]) => [k, v.singular])));
const iconOptions = opts({
  layout: "Layout (frontend)",
  server: "Server (backend)",
  layers: "Layers (full-stack)",
  chart: "Chart (data)",
  brain: "Brain (ML)",
  network: "Network (deep learning)",
  eye: "Eye (computer vision)",
  message: "Message (NLP)",
  sparkles: "Sparkles (generative AI)",
  workflow: "Bot (agents)",
  container: "Container (MLOps)",
  cpu: "CPU (local AI)",
  terminal: "Terminal (tools)",
});

const str = (value: unknown) => (typeof value === "string" ? value : "");

const visibleToggle: Toggle = {
  label: "Visibility",
  isOn: (item) => Boolean(item.is_visible),
  body: (next) => ({ is_visible: next }),
  onText: "Visible",
  offText: "Hidden",
};

const displayOrder: FieldDef = {
  name: "display_order",
  label: "Display order",
  type: "number",
  min: 0,
  defaultValue: 0,
  help: "Lower numbers appear first. You can also reorder from the list.",
};

const isVisible: FieldDef = {
  name: "is_visible",
  label: "Visible on the public site",
  type: "checkbox",
  defaultValue: true,
};

const SLUG_HELP = "Used in the URL. Leave empty to generate it from the title; changing it later breaks old links.";

/* -------------------------------------------------------------------------- */

const projects: ResourceDef = {
  key: "projects",
  endpoint: "/admin/projects",
  title: "Projects",
  singular: "project",
  description: "Case studies shown on the Projects page. Drafts are never visible to visitors.",
  titleOf: (item) => str(item.title),
  subtitleOf: (item) => (item.subtitle as string | null) ?? null,
  reorderable: true,
  publicHref: (item) => (item.is_published ? `/projects/${item.slug}` : null),
  filters: [
    { param: "published", label: "Publishing", options: [{ value: "true", label: "Published" }, { value: "false", label: "Drafts" }] },
    { param: "status", label: "Status", options: statusOptions },
  ],
  columns: [
    {
      label: "Status",
      render: (item) => {
        const meta = projectStatusMeta[item.status as keyof typeof projectStatusMeta];
        return meta ? <StatusBadge label={meta.label} tone={meta.tone} /> : null;
      },
    },
    { label: "Category", render: (item) => str((item.category as { title?: string } | undefined)?.title), secondary: true },
  ],
  toggles: [
    {
      label: "Publishing",
      isOn: (item) => Boolean(item.is_published),
      body: (next) => ({ is_published: next }),
      onText: "Published",
      offText: "Draft",
    },
    {
      label: "Featured",
      isOn: (item) => Boolean(item.is_featured),
      body: (next) => ({ is_featured: next }),
      onText: "Featured",
      offText: "Not featured",
    },
  ],
  sections: [
    {
      title: "Basics",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, maxLength: 120 },
        { name: "slug", label: "Slug", type: "text", maxLength: 100, help: SLUG_HELP, placeholder: "local-ai-lab" },
        { name: "subtitle", label: "Subtitle", type: "text", maxLength: 160, placeholder: "AI Model Benchmarking Platform" },
        { name: "label", label: "Highlight label", type: "text", maxLength: 60, placeholder: "Final Year Project" },
        { name: "summary", label: "Short description", type: "textarea", required: true, maxLength: 400, rows: 3, help: "Shown on project cards and in search results." },
        { name: "description", label: "Detailed description", type: "textarea", markdown: true, rows: 8, help: "Optional overview shown at the top of the project page. Markdown is supported." },
      ],
    },
    {
      title: "Classification",
      fields: [
        { name: "category_id", label: "Primary category", type: "relation", source: "project-categories", required: true },
        { name: "subcategory", label: "Subcategory", type: "text", maxLength: 80, placeholder: "LLM benchmarking" },
        { name: "status", label: "Status", type: "select", options: statusOptions, required: true, defaultValue: "planned", help: "Be honest: planned and in-progress work is labelled as such." },
        { name: "role", label: "Your role", type: "text", maxLength: 150, placeholder: "Individual project / Team of 3 — ML lead" },
        { name: "start_date", label: "Start date", type: "partial-date" },
        { name: "end_date", label: "Completion date", type: "partial-date", help: "Leave empty while ongoing." },
        { name: "secondary_category_ids", label: "Additional categories", type: "multi-relation", source: "project-categories" },
        { name: "technologies", label: "Technologies", type: "tags", placeholder: "Python, FastAPI, Docker", help: "Press Enter or comma to add. Order is kept on the site." },
      ],
    },
    {
      title: "Case study",
      description: "Empty sections are hidden on the public page.",
      fields: [
        { name: "problem", label: "Problem being solved", type: "textarea", rows: 4, maxLength: 5000 },
        {
          name: "features",
          label: "Features",
          type: "repeater",
          itemLabel: "Feature",
          titleField: "name",
          maxItems: 50,
          help: "Mark each feature as implemented, in progress, or planned.",
          fields: [
            { name: "name", label: "Feature", type: "text", required: true, maxLength: 150 },
            { name: "status", label: "Status", type: "select", options: featureOptions, required: true, defaultValue: "planned" },
            { name: "description", label: "Description", type: "text", maxLength: 500, wide: true },
          ],
        },
        { name: "contribution", label: "My contribution", type: "lines" },
        { name: "implementation", label: "Technical implementation", type: "lines" },
        { name: "architecture", label: "Architecture", type: "textarea", rows: 4, maxLength: 10000, help: "How the parts fit together. Add diagrams under Media." },
        {
          name: "decisions",
          label: "Key engineering decisions",
          type: "repeater",
          itemLabel: "Decision",
          titleField: "title",
          maxItems: 30,
          fields: [
            { name: "title", label: "Decision", type: "text", required: true, maxLength: 150 },
            { name: "detail", label: "Reasoning", type: "text", required: true, maxLength: 2000, wide: true },
          ],
        },
        { name: "challenges", label: "Challenges", type: "lines" },
        { name: "lessons", label: "Lessons learned", type: "lines" },
        { name: "next_steps", label: "Next steps", type: "lines" },
      ],
    },
    {
      title: "Results & evaluation",
      description: "Only add results you have actually measured, and say how they were measured.",
      fields: [
        {
          name: "results",
          label: "Measured results",
          type: "repeater",
          itemLabel: "Result",
          titleField: "label",
          maxItems: 30,
          fields: [
            { name: "label", label: "Metric", type: "text", required: true, maxLength: 100, placeholder: "Validation F1 (macro)" },
            { name: "value", label: "Value", type: "text", required: true, maxLength: 50, placeholder: "0.87" },
            { name: "context", label: "How it was measured", type: "text", maxLength: 300, wide: true, placeholder: "Dataset, split, hardware, model version" },
          ],
        },
        { name: "evaluation_note", label: "Evaluation note", type: "textarea", rows: 3, maxLength: 2000, help: "Shown when no results are published yet." },
      ],
    },
    {
      title: "Media & links",
      fields: [
        {
          name: "images",
          label: "Screenshots and diagrams",
          type: "repeater",
          itemLabel: "Image",
          titleField: "alt",
          maxItems: 30,
          help: "Use real screenshots only. The first screenshot becomes the cover image.",
          fields: [
            { name: "url", label: "Image URL", type: "link", required: true, wide: true, placeholder: "https://… or /images/projects/slug/screen.png" },
            { name: "alt", label: "Alt text", type: "text", required: true, maxLength: 300, help: "Describe what the image shows." },
            { name: "kind", label: "Type", type: "select", options: [{ value: "screenshot", label: "Screenshot" }, { value: "diagram", label: "Architecture diagram" }], required: true, defaultValue: "screenshot" },
            { name: "caption", label: "Caption", type: "text", maxLength: 300, wide: true },
            { name: "width", label: "Width (px)", type: "number", min: 1, max: 10000 },
            { name: "height", label: "Height (px)", type: "number", min: 1, max: 10000 },
          ],
        },
        { name: "github_url", label: "GitHub repository", type: "url", placeholder: "https://github.com/Khizer45/…" },
        { name: "demo_url", label: "Live demo", type: "url" },
        { name: "docs_url", label: "Documentation", type: "url" },
        { name: "video_url", label: "Video walkthrough", type: "url" },
      ],
    },
    {
      title: "Notice",
      description: "Optional callout near the top of the page, e.g. a medical or safety disclaimer.",
      fields: [
        { name: "notice_title", label: "Notice title", type: "text", maxLength: 150 },
        { name: "notice_body", label: "Notice text", type: "textarea", rows: 3, maxLength: 2000 },
      ],
    },
    {
      title: "Publishing",
      fields: [
        { name: "is_published", label: "Published", type: "checkbox", help: "Visible on the public site." },
        { name: "is_featured", label: "Featured on the home page", type: "checkbox" },
        displayOrder,
      ],
    },
  ],
};

const skills: ResourceDef = {
  key: "skills",
  endpoint: "/admin/skills",
  title: "Skills",
  singular: "skill",
  description: "Grouped by category on the Skills page. Use honest proficiency labels.",
  titleOf: (item) => str(item.name),
  reorderable: true,
  columns: [
    { label: "Category", render: (item) => str((item.category as { title?: string } | undefined)?.title), secondary: true },
    { label: "Status", render: (item) => <span className="text-sm text-fg-muted">{item.is_learning ? "Learning" : "—"}</span> },
  ],
  toggles: [
    visibleToggle,
    { label: "Featured", isOn: (i) => Boolean(i.is_featured), body: (next) => ({ is_featured: next }), onText: "Featured", offText: "Not featured" },
  ],
  filters: [{ param: "visible", label: "Visibility", options: [{ value: "true", label: "Visible" }, { value: "false", label: "Hidden" }] }],
  sections: [
    {
      title: "Skill",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, maxLength: 80, placeholder: "FastAPI" },
        { name: "category_id", label: "Category", type: "relation", source: "skill-categories", required: true },
        { name: "evidence_project_id", label: "Evidence project", type: "relation", source: "projects", allowEmpty: "None", help: "A project that demonstrates this skill. Only shown if published." },
        { name: "description", label: "Description", type: "textarea", rows: 2, maxLength: 1000 },
        { name: "is_learning", label: "Currently learning", type: "checkbox" },
        { name: "is_featured", label: "Show on the home page", type: "checkbox" },
        isVisible,
        displayOrder,
      ],
    },
  ],
};

const experience: ResourceDef = {
  key: "experience",
  endpoint: "/admin/experiences",
  title: "Experience",
  singular: "experience entry",
  description: "Jobs, internships, freelance work, contracts, volunteering, and open-source work.",
  titleOf: (item) => str(item.role),
  subtitleOf: (item) => `${item.is_confidential ? "Confidential client" : str(item.organization)} · ${employmentTypeLabel[item.employment_type as keyof typeof employmentTypeLabel] ?? ""}`,
  reorderable: true,
  columns: [
    {
      label: "Dates",
      render: (item) => (
        <span className="font-mono text-xs text-fg-muted">
          {item.end_date
            ? formatRange(str(item.start_date), str(item.end_date))
            : item.is_current
              ? formatRange(str(item.start_date), undefined, "Present")
              : formatMonth(str(item.start_date))}
        </span>
      ),
      secondary: true,
    },
  ],
  toggles: [visibleToggle],
  sections: [
    {
      title: "Role",
      fields: [
        { name: "role", label: "Job title", type: "text", required: true, maxLength: 150 },
        { name: "employment_type", label: "Type", type: "select", options: opts(employmentTypeLabel), required: true, defaultValue: "full_time" },
        { name: "organization", label: "Organization or client", type: "text", required: true, maxLength: 150 },
        { name: "organization_url", label: "Organization website", type: "url" },
        { name: "is_confidential", label: "Confidential client", type: "checkbox", help: "Shows \"Confidential client\" instead of the name and hides the website.", wide: true },
        { name: "location", label: "Location", type: "text", maxLength: 120, placeholder: "Mirpur, AJK, Pakistan" },
        { name: "work_mode", label: "Work mode", type: "select", options: opts(workModeLabel), allowEmpty: "Not specified" },
        { name: "start_date", label: "Start date", type: "partial-date", required: true },
        { name: "end_date", label: "End date", type: "partial-date", help: "Leave empty for a current role." },
        { name: "is_current", label: "I currently work here", type: "checkbox", wide: true },
      ],
    },
    {
      title: "Details",
      fields: [
        { name: "description", label: "Summary", type: "textarea", rows: 3, maxLength: 5000 },
        { name: "responsibilities", label: "Responsibilities", type: "lines" },
        { name: "achievements", label: "Verified achievements", type: "lines", help: "One per line. Only achievements you can verify." },
        { name: "technologies", label: "Technologies", type: "tags" },
        { name: "link_label", label: "Link label", type: "text", maxLength: 80, placeholder: "Company website" },
        { name: "link_url", label: "Link URL", type: "url" },
      ],
    },
    { title: "Publishing", fields: [isVisible, displayOrder] },
  ],
};

const certifications: ResourceDef = {
  key: "certifications",
  endpoint: "/admin/certifications",
  title: "Certifications",
  singular: "certification",
  description: "Only certificates you hold. Add the verification link whenever the issuer provides one.",
  titleOf: (item) => str(item.name),
  subtitleOf: (item) => str(item.issuer),
  reorderable: true,
  columns: [{ label: "Issued", render: (item) => <span className="font-mono text-xs text-fg-muted">{str(item.issue_date)}</span>, secondary: true }],
  toggles: [visibleToggle],
  sections: [
    {
      title: "Certificate",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, maxLength: 200, wide: true },
        { name: "issuer", label: "Issuing organization", type: "text", required: true, maxLength: 150 },
        { name: "credential_id", label: "Credential ID", type: "text", maxLength: 120, help: "Only if it is public." },
        { name: "issue_date", label: "Issue date", type: "partial-date", required: true },
        { name: "expiration_date", label: "Expiration date", type: "partial-date" },
        { name: "verification_url", label: "Verification URL", type: "url" },
        { name: "file_url", label: "Certificate image or PDF", type: "link", help: "A URL, or a file in the frontend's public/certificates/ folder (e.g. /certificates/aws.pdf)." },
        { name: "related_skills", label: "Related skills", type: "tags" },
        { name: "description", label: "Description", type: "textarea", rows: 3, maxLength: 2000 },
      ],
    },
    { title: "Publishing", fields: [isVisible, displayOrder] },
  ],
};

const education: ResourceDef = {
  key: "education",
  endpoint: "/admin/education",
  title: "Education",
  singular: "education entry",
  description: "Degrees and schools. The primary entry is highlighted on the home page.",
  titleOf: (item) => str(item.qualification),
  subtitleOf: (item) => str(item.institution),
  reorderable: true,
  columns: [
    { label: "Primary", render: (item) => (item.is_primary ? <StateBadge on onLabel="Primary" offLabel="" /> : null), secondary: true },
  ],
  toggles: [visibleToggle],
  sections: [
    {
      title: "Qualification",
      fields: [
        { name: "qualification", label: "Qualification", type: "text", required: true, maxLength: 150, placeholder: "BS Software Engineering" },
        { name: "institution", label: "Institution", type: "text", required: true, maxLength: 200 },
        { name: "field_of_study", label: "Field of study", type: "text", maxLength: 150 },
        { name: "location", label: "Location", type: "text", maxLength: 120 },
        { name: "start_date", label: "Start", type: "partial-date", required: true },
        { name: "end_date", label: "End", type: "partial-date" },
        { name: "grade", label: "Grade", type: "text", maxLength: 60, placeholder: "CGPA 3.45 / 4.00" },
        { name: "is_primary", label: "Primary (shown on the home page)", type: "checkbox", help: "Marking this primary unmarks the previous one." },
        { name: "description", label: "Description", type: "textarea", rows: 3, maxLength: 3000 },
        { name: "highlights", label: "Highlights", type: "lines" },
        { name: "coursework", label: "Relevant coursework", type: "tags" },
      ],
    },
    { title: "Publishing", fields: [isVisible, displayOrder] },
  ],
};

const achievements: ResourceDef = {
  key: "achievements",
  endpoint: "/admin/achievements",
  title: "Awards & publications",
  singular: "achievement",
  description: "Awards, achievements, scholarships, competitions, and publications. Shown on the Certifications page.",
  titleOf: (item) => str(item.title),
  subtitleOf: (item) => `${achievementTypeMeta[item.type as keyof typeof achievementTypeMeta]?.singular ?? ""} · ${str(item.issuer)}`,
  reorderable: true,
  columns: [{ label: "Date", render: (item) => <span className="font-mono text-xs text-fg-muted">{str(item.date)}</span>, secondary: true }],
  toggles: [visibleToggle],
  sections: [
    {
      title: "Details",
      fields: [
        { name: "type", label: "Type", type: "select", options: achievementOptions, required: true, defaultValue: "award" },
        { name: "title", label: "Title", type: "text", required: true, maxLength: 200 },
        { name: "issuer", label: "Awarded by / published in", type: "text", required: true, maxLength: 150 },
        { name: "date", label: "Date", type: "partial-date", required: true },
        { name: "url", label: "Link", type: "url" },
        { name: "description", label: "Description", type: "textarea", rows: 3, maxLength: 2000 },
      ],
    },
    { title: "Publishing", fields: [isVisible, displayOrder] },
  ],
};

const articles: ResourceDef = {
  key: "articles",
  endpoint: "/admin/articles",
  title: "Articles",
  singular: "article",
  description: "Technical writing. Drafts never appear on the public site.",
  titleOf: (item) => str(item.title),
  subtitleOf: (item) => (item.external_url ? `External · ${item.external_url}` : `/writing/${item.slug}`),
  publicHref: (item) => (item.status === "published" && !item.external_url ? `/writing/${item.slug}` : null),
  columns: [],
  toggles: [
    {
      label: "Publishing",
      isOn: (item) => item.status === "published",
      body: (next) => ({ status: next ? "published" : "draft" }),
      onText: "Published",
      offText: "Draft",
    },
  ],
  sections: [
    {
      title: "Article",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, maxLength: 200, wide: true },
        { name: "slug", label: "Slug", type: "text", maxLength: 120, help: SLUG_HELP },
        { name: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }], required: true, defaultValue: "draft" },
        { name: "summary", label: "Summary", type: "textarea", required: true, rows: 2, maxLength: 500 },
        { name: "content", label: "Content", type: "textarea", markdown: true, rows: 18, help: "Markdown. Raw HTML is not rendered, for security." },
        { name: "tags", label: "Tags", type: "tags" },
        { name: "external_url", label: "External URL", type: "url", help: "Published elsewhere (Medium, dev.to)? Link it here instead of writing content." },
        { name: "related_project_id", label: "Related project", type: "relation", source: "projects", allowEmpty: "None" },
      ],
    },
  ],
};

const projectCategories: ResourceDef = {
  key: "project-categories",
  endpoint: "/admin/project-categories",
  title: "Project categories",
  singular: "category",
  description: "Every category has its own public page. Categories without projects show \"Projects coming soon\".",
  titleOf: (item) => str(item.title),
  subtitleOf: (item) => `/projects/category/${item.slug}`,
  reorderable: true,
  publicHref: (item) => `/projects/category/${item.slug}`,
  columns: [{ label: "Projects", render: (item) => <span className="text-sm text-fg-muted">{String(item.project_count ?? 0)}</span> }],
  sections: [
    {
      title: "Category",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, maxLength: 120 },
        { name: "short_title", label: "Short title", type: "text", required: true, maxLength: 60, help: "Used in filters and badges." },
        { name: "slug", label: "Slug", type: "text", maxLength: 80, help: SLUG_HELP },
        { name: "icon", label: "Icon", type: "select", options: iconOptions, required: true, defaultValue: "layers" },
        { name: "description", label: "Description", type: "textarea", rows: 2, maxLength: 2000 },
        { name: "focus_areas", label: "What this category covers", type: "lines" },
        displayOrder,
      ],
    },
  ],
};

const skillCategories: ResourceDef = {
  key: "skill-categories",
  endpoint: "/admin/skill-categories",
  title: "Skill categories",
  singular: "skill category",
  description: "Groups on the Skills page. A category with no visible skills is hidden.",
  titleOf: (item) => str(item.title),
  reorderable: true,
  columns: [{ label: "Skills", render: (item) => <span className="text-sm text-fg-muted">{String(item.skill_count ?? 0)}</span> }],
  sections: [
    {
      title: "Category",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, maxLength: 120 },
        { name: "slug", label: "Slug", type: "text", maxLength: 80, help: SLUG_HELP },
        { name: "description", label: "Description", type: "textarea", rows: 2, maxLength: 1000 },
        displayOrder,
      ],
    },
  ],
};

export const RESOURCES: Record<string, ResourceDef> = Object.fromEntries(
  [projects, skills, experience, certifications, education, achievements, articles, projectCategories, skillCategories].map(
    (r) => [r.key, r],
  ),
);

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES[key];
}
