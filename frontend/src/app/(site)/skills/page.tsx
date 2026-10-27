import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getSkillGroups } from "@/lib/content";

export const metadata: Metadata = {
  title: "Skills",
  description:
    "Technical skills of Khizer Hayat grouped by area — Python, FastAPI, machine learning, deep learning, computer vision, Docker, and more.",
  alternates: { canonical: "/skills" },
};

export const revalidate = 300;

export default async function SkillsPage() {
  const groups = await getSkillGroups();

  return (
    <>
      <PageHeader
        eyebrow="Skills"
        title="Skills and tools"
        description="The languages, frameworks, and tools I work with, grouped by area. Where a skill is applied in a project, it links to it."
      />

      <Container className="py-12 sm:py-16">
        {groups.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {groups.map((group) => (
              <section
                key={group.slug}
                aria-labelledby={`skills-${group.slug}`}
                className="card rounded-2xl"
              >
                <h2 id={`skills-${group.slug}`} className="border-b border-line px-5 py-4 font-semibold sm:px-6">
                  {group.title}
                </h2>
                <ul className="divide-y divide-line">
                  {group.skills.map((skill) => (
                    <li key={skill.name} className="px-5 py-3.5 sm:px-6">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                        {skill.name}
                        {skill.is_learning && <LearningTag />}
                      </p>
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
            title="Skills will be added here"
            description="Languages, frameworks, and tools will be listed here, grouped by area."
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
