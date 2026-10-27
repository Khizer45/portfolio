import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { ImagePlaceholder, ProjectImageView } from "@/components/projects/project-cover";
import { MetricChip, StatusBadge, Tag } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/format";
import { projectStatusMeta } from "@/lib/labels";
import type { ProjectSummary } from "@/types/api";

const MAX_TAGS = 5;

export function ProjectCard({
  project,
  headingLevel = "h3",
  index,
  className,
}: {
  project: ProjectSummary;
  headingLevel?: "h2" | "h3";
  /** Position in the list, shown as "P-01". */
  index?: number;
  className?: string;
}) {
  const Heading = headingLevel;
  const status = projectStatusMeta[project.status];
  const cover = project.cover_image;
  const extraTags = project.technologies.length - MAX_TAGS;

  return (
    <article
      className={cn(
        "card card-hover group relative flex min-w-0 flex-col rounded-2xl p-3 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent",
        className,
      )}
    >
      <div className="relative aspect-[2/1] overflow-hidden rounded-xl border border-line">
        {index !== undefined && (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-md border border-[var(--btn-border-secondary)] bg-surface px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-fg">
            P-{String(index + 1).padStart(2, "0")}
          </span>
        )}
        {cover ? (
          <ProjectImageView image={cover} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <ImagePlaceholder icon={project.category.icon} label={project.category.short_title} decorative />
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 pt-5 pb-3 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge label={status.label} tone={status.tone} />
          {project.label && <span className="text-xs font-medium text-fg-subtle">{project.label}</span>}
        </div>
        <Heading className="text-xl font-semibold tracking-tight">
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {project.title}
          </Link>
        </Heading>
        {project.subtitle && <p className="mt-0.5 text-sm text-fg-subtle">{project.subtitle}</p>}
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">{project.summary}</p>
        {project.highlights && project.highlights.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Results">
            {project.highlights.map((metric) => (
              <li key={metric.label}>
                <MetricChip value={metric.value} label={metric.label} />
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
          {project.technologies.slice(0, MAX_TAGS).map((tech) => (
            <li key={tech}>
              <Tag>{tech}</Tag>
            </li>
          ))}
          {extraTags > 0 && (
            <li>
              <Tag>+{extraTags}</Tag>
            </li>
          )}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-4 pt-6 text-xs text-fg-subtle">
          <span className="min-w-0 truncate font-mono">{project.categories.map((c) => c.short_title).join(" · ")}</span>
          <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap text-accent">
            View project
            <ArrowUpRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProjectGrid({ projects, headingLevel }: { projects: ProjectSummary[]; headingLevel?: "h2" | "h3" }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {projects.map((project, index) => (
        <Reveal as="li" key={project.slug} delay={(index % 2) * 90} className="flex">
          <ProjectCard project={project} headingLevel={headingLevel} index={index} className="w-full" />
        </Reveal>
      ))}
    </ul>
  );
}
