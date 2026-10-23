import type {
  AchievementType,
  EmploymentType,
  FeatureStatus,
  ProjectStatus,
  SkillLevel,
  WorkMode,
} from "@/types/api";

export type Tone = "neutral" | "amber" | "violet" | "emerald" | "blue";

export const projectStatusMeta: Record<ProjectStatus, { label: string; description: string; tone: Tone }> = {
  planned: {
    label: "Planned",
    description: "Scoped and designed; implementation has not started.",
    tone: "neutral",
  },
  in_progress: {
    label: "In Progress",
    description: "Under active development. Features are labelled individually.",
    tone: "amber",
  },
  prototype: {
    label: "Prototype",
    description: "A working proof of concept, not yet production-ready.",
    tone: "violet",
  },
  completed: {
    label: "Completed",
    description: "Implemented as scoped. Not publicly deployed.",
    tone: "emerald",
  },
  deployed: {
    label: "Deployed",
    description: "Running publicly and available to use.",
    tone: "blue",
  },
};

export const projectStatusOrder: ProjectStatus[] = ["deployed", "completed", "prototype", "in_progress", "planned"];

export const featureStatusMeta: Record<FeatureStatus, { label: string; tone: Tone }> = {
  implemented: { label: "Implemented", tone: "emerald" },
  in_progress: { label: "In progress", tone: "amber" },
  planned: { label: "Planned", tone: "neutral" },
};

export const employmentTypeLabel: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  freelance: "Freelance",
  contract: "Contract",
  volunteer: "Volunteer",
  open_source: "Open source",
};

export const workModeLabel: Record<WorkMode, string> = {
  on_site: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const achievementTypeMeta: Record<AchievementType, { title: string; singular: string }> = {
  award: { title: "Awards", singular: "Award" },
  achievement: { title: "Achievements", singular: "Achievement" },
  scholarship: { title: "Scholarships", singular: "Scholarship" },
  competition: { title: "Competitions", singular: "Competition" },
  publication: { title: "Publications", singular: "Publication" },
};

/** What each proficiency label means. Shown as a legend on the Skills page. */
export const skillLevelMeta: Record<SkillLevel, { label: string; description: string; steps: number }> = {
  beginner: {
    label: "Beginner",
    description: "Learned the fundamentals and used it in coursework, exercises, or early project work.",
    steps: 1,
  },
  intermediate: {
    label: "Intermediate",
    description: "Used it independently in projects and comfortable with common patterns.",
    steps: 2,
  },
  advanced: {
    label: "Advanced",
    description: "Used it extensively; can design, debug, and review work with it.",
    steps: 3,
  },
};
