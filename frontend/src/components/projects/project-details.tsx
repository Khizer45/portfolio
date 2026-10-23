import { BookOpen, CircleCheck, CircleDashed, ExternalLink, LoaderCircle, PlayCircle } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { GitHubIcon } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { featureStatusMeta } from "@/lib/labels";
import type { FeatureStatus, ProjectDetail, ProjectFeature } from "@/types/api";

const featureIcon: Record<FeatureStatus, { icon: typeof CircleCheck; className: string }> = {
  implemented: { icon: CircleCheck, className: "text-tone-emerald" },
  in_progress: { icon: LoaderCircle, className: "text-tone-amber" },
  planned: { icon: CircleDashed, className: "text-tone-neutral" },
};

/** Section wrapper with a consistent heading for the case-study body. */
export function DetailSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("scroll-mt-24", className)}>
      <h2 id={id} className="mb-4 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-relaxed text-fg-muted">
          <span aria-hidden="true" className="mt-[0.7em] size-1 shrink-0 rounded-full bg-fg-subtle" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FeatureList({ features }: { features: ProjectFeature[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {features.map((feature) => {
        const meta = featureStatusMeta[feature.status];
        const { icon: Icon, className } = featureIcon[feature.status];
        return (
          <li key={feature.name} className="flex gap-3.5 px-4 py-3.5 sm:px-5">
            <Icon className={cn("mt-0.5 size-[1.125rem] shrink-0", className)} aria-hidden="true" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium text-fg">{feature.name}</p>
                <p className="font-mono text-[0.7rem] tracking-[0.08em] text-fg-subtle uppercase">{meta.label}</p>
              </div>
              {feature.description && (
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{feature.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Repository, demo, docs, and video buttons. Renders nothing when no links exist. */
export function ProjectLinks({
  project,
  size = "md",
}: {
  project: Pick<ProjectDetail, "github_url" | "demo_url" | "docs_url" | "video_url">;
  size?: "sm" | "md";
}) {
  const items = [
    project.demo_url && { href: project.demo_url, label: "Live demo", icon: ExternalLink, variant: "primary" as const },
    project.github_url && { href: project.github_url, label: "Source code", icon: GitHubIcon, variant: "secondary" as const },
    project.docs_url && { href: project.docs_url, label: "Documentation", icon: BookOpen, variant: "secondary" as const },
    project.video_url && { href: project.video_url, label: "Video walkthrough", icon: PlayCircle, variant: "secondary" as const },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: "primary" | "secondary";
  }>;

  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ href, label, icon: Icon, variant }) => (
        <ButtonLink key={href} href={href} external variant={variant} size={size}>
          <Icon className="size-4" aria-hidden="true" />
          {label}
          <span className="sr-only">(opens in a new tab)</span>
        </ButtonLink>
      ))}
    </div>
  );
}
