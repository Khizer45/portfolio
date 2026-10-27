import { Briefcase } from "lucide-react";
import type { Metadata } from "next";

import { ArrowLink } from "@/components/ui/arrow-link";
import { Tag } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getExperience } from "@/lib/content";
import { formatDuration, formatRange } from "@/lib/format";
import { employmentTypeLabel, workModeLabel } from "@/lib/labels";
import type { Experience } from "@/types/api";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Internships and professional experience of Khizer Hayat, Software Engineer focused on AI/ML.",
  alternates: { canonical: "/experience" },
};

export const revalidate = 300;

/** "Islamabad · Remote", skipping the work mode when the location already says it. */
function locationLine(item: Experience): string {
  const mode = item.work_mode ? workModeLabel[item.work_mode] : null;
  const parts = [item.location];
  if (mode && item.location.trim().toLowerCase() !== mode.toLowerCase()) parts.push(mode);
  return parts.filter(Boolean).join(" · ");
}

export default async function ExperiencePage() {
  const experience = await getExperience();

  return (
    <>
      <PageHeader
        eyebrow="Experience"
        title="Experience"
        description="Internships and professional roles, most recent first."
      />

      <Container className="py-12 sm:py-16">
        <section aria-label="Work experience">
          {experience.length > 0 ? (
            <ol className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[0.3125rem] before:w-px before:bg-line sm:before:left-[11.96875rem]">
              {experience.map((item) => {
                const end = item.end_date ?? undefined;
                const duration = end ? formatDuration(item.start_date, end) : null;
                const location = locationLine(item);
                return (
                  <li key={item.id} className="relative grid gap-3 pl-8 sm:grid-cols-[11rem_1fr] sm:gap-8 sm:pl-0">
                    <span
                      aria-hidden="true"
                      className="absolute top-2 left-0 size-[0.6875rem] rounded-full border-2 border-accent bg-bg sm:left-[11.65625rem]"
                    />
                    <div className="sm:pt-0.5 sm:text-right">
                      <p className="font-mono text-sm text-fg">{formatRange(item.start_date, end)}</p>
                      {duration && <p className="mt-0.5 text-xs text-fg-subtle">{duration}</p>}
                    </div>
                    <article className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight">{item.role}</h3>
                          <p className="mt-0.5 text-fg-muted">
                            {item.organization_url ? (
                              <a
                                href={item.organization_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-accent"
                              >
                                {item.organization}
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            ) : (
                              item.organization
                            )}
                          </p>
                        </div>
                        <span className="rounded-full border border-accent-line bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                          {employmentTypeLabel[item.employment_type]}
                        </span>
                      </div>
                      {location && <p className="mt-2 text-sm text-fg-subtle">{location}</p>}
                      {item.description && <p className="mt-4 leading-relaxed text-fg-muted">{item.description}</p>}
                      {item.responsibilities.length > 0 && (
                        <ul className="mt-4 space-y-2.5">
                          {item.responsibilities.map((line) => (
                            <li key={line} className="flex gap-3 text-[0.9375rem] leading-relaxed text-fg-muted">
                              <span aria-hidden="true" className="mt-[0.7em] size-1 shrink-0 rounded-full bg-fg-subtle" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.achievements.length > 0 && (
                        <div className="mt-5">
                          <h4 className="text-sm font-medium text-fg">Achievements</h4>
                          <ul className="mt-2 space-y-2">
                            {item.achievements.map((line) => (
                              <li key={line} className="flex gap-3 text-[0.9375rem] leading-relaxed text-fg-muted">
                                <span aria-hidden="true" className="mt-[0.7em] size-1 shrink-0 rounded-full bg-accent" />
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.technologies.length > 0 && (
                        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
                          {item.technologies.map((tech) => (
                            <li key={tech}>
                              <Tag>{tech}</Tag>
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.link_url && (
                        <div className="mt-5">
                          <ArrowLink href={item.link_url} external>
                            {item.link_label || "Learn more"}
                          </ArrowLink>
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              icon={Briefcase}
              title="Experience will be added here"
              description="Professional roles, internships, and freelance work will appear here."
            />
          )}
        </section>

      </Container>
    </>
  );
}
