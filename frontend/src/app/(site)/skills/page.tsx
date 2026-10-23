import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getSkillGroups } from "@/lib/content";
import { cn } from "@/lib/format";
import { skillLevelMeta } from "@/lib/labels";
import type { SkillLevel } from "@/types/api";

export const metadata: Metadata = {
  title: "Skills",
  description:
    "Technical skills of Khizer Hayat grouped by area — Python, FastAPI, machine learning, deep learning, computer vision, Docker, and more — with honest proficiency labels.",
  alternates: { canonical: "/skills" },
};

export const revalidate = 300;

const levels = Object.keys(skillLevelMeta) as SkillLevel[];

function LevelMeter({ level }: { level: SkillLevel }) {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={cn("h-1.5 w-3 rounded-full", step <= skillLevelMeta[level].steps ? "bg-accent" : "bg-line-strong")}
        />
      ))}
    </span>
  );
}

export default async function SkillsPage() {
  const groups = await getSkillGroups();

  return (
    <>
      <PageHeader
        eyebrow="Skills"
        title="Skills and proficiency"
        description="Grouped by area, with descriptive proficiency labels instead of percentages. Where a skill is applied in a project, it links to it."
      />

      <Container className="py-12 sm:py-16">
        <section aria-labelledby="legend-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="legend-heading" className="font-medium">
            How to read these levels
          </h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {levels.map((level) => (
              <div key={level}>
                <dt className="flex items-center gap-2.5 text-sm font-medium text-fg">
                  <LevelMeter level={level} />
                  {skillLevelMeta[level].label}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-fg-muted">{skillLevelMeta[level].description}</dd>
              </div>
            ))}
            <div>
              <dt className="flex items-center gap-2.5 text-sm font-medium text-fg">
                <LearningTag />
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-fg-muted">Currently studying and practising.</dd>
            </div>
          </dl>
        </section>

        {groups.length > 0 ? (
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {groups.map((group) => (
              <section
                key={group.slug}
                aria-labelledby={`skills-${group.slug}`}
                className="rounded-2xl border border-line bg-surface"
              >
                <h2 id={`skills-${group.slug}`} className="border-b border-line px-5 py-4 font-semibold sm:px-6">
                  {group.title}
                </h2>
                <ul className="divide-y divide-line">
                  {group.skills.map((skill) => (
                    <li key={skill.name} className="px-5 py-3.5 sm:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                          {skill.name}
                          {skill.is_learning && <LearningTag />}
                        </p>
                        <p className="flex items-center gap-2.5 text-sm text-fg-muted">
                          <LevelMeter level={skill.level} />
                          <span>{skillLevelMeta[skill.level].label}</span>
                        </p>
                      </div>
                      {skill.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{skill.description}</p>
                      )}
                      {skill.evidence_project && (
                        <p className="mt-1.5 text-xs text-fg-subtle">
                          Used in{" "}
                          <Link
                            href={`/projects/${skill.evidence_project.slug}`}
                            className="text-fg-muted underline decoration-line-strong underline-offset-2 hover:text-accent hover:decoration-current"
                          >
                            {skill.evidence_project.title}
                          </Link>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Wrench}
            className="mt-12"
            title="Skills will be added here"
            description="Languages, frameworks, and tools will be listed here with their proficiency levels."
          />
        )}
      </Container>
    </>
  );
}

function LearningTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-accent-line bg-accent-soft px-2 py-px text-[0.7rem] font-medium text-accent">
      Learning
    </span>
  );
}
