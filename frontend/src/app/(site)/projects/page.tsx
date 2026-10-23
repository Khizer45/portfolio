import { FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryCard } from "@/components/projects/category-card";
import { ProjectExplorer, ProjectExplorerFallback } from "@/components/projects/project-explorer";
import { StatusBadge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { site } from "@/data/site";
import { getCategories, getProjects } from "@/lib/content";
import { projectStatusMeta, projectStatusOrder } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software and AI engineering projects by Khizer Hayat — computer vision, model benchmarking, LLM applications, and backend systems, each labelled with its real status.",
  alternates: { canonical: "/projects" },
};

export const revalidate = 300;

export default async function ProjectsPage() {
  const [projects, categories] = await Promise.all([getProjects(), getCategories()]);
  const activeCategories = categories.filter((c) => c.project_count > 0);
  const emptyCategories = categories.filter((c) => c.project_count === 0);
  const directory = [...activeCategories, ...(site.showEmptyCategories ? emptyCategories : [])];

  const explorerProps = {
    projects,
    categoryOptions: activeCategories.map((c) => ({ slug: c.slug, label: c.short_title, count: c.project_count })),
    statusOptions: projectStatusOrder.filter((status) => projects.some((p) => p.status === status)),
    technologyOptions: [...new Set(projects.flatMap((p) => p.technologies))].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    ),
  };

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="Things I've built and am building"
        description="Each project is labelled with its actual status, and in-progress work marks every feature as implemented, in progress, or planned."
      >
        <p className="mb-3 font-mono text-xs tracking-[0.14em] text-fg-subtle uppercase">Status key</p>
        <ul className="flex flex-wrap gap-2" aria-label="Status key">
          {projectStatusOrder.map((status) => (
            <li key={status}>
              <StatusBadge
                label={projectStatusMeta[status].label}
                tone={projectStatusMeta[status].tone}
                title={projectStatusMeta[status].description}
              />
            </li>
          ))}
        </ul>
      </PageHeader>

      <Container className="py-12 sm:py-16">
        {projects.length > 0 ? (
          <Suspense fallback={<ProjectExplorerFallback {...explorerProps} />}>
            <ProjectExplorer {...explorerProps} />
          </Suspense>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="Projects coming soon"
            description="Projects will appear here as they are published."
          />
        )}
      </Container>

      {directory.length > 0 && (
        <section aria-labelledby="categories-heading" className="border-t border-line py-16 sm:py-20">
          <Container>
            <SectionHeading
              id="categories-heading"
              title="Browse by category"
              description="Every category has its own page. Categories without projects yet are listed as coming soon."
            />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {directory.map((category) => (
                <li key={category.slug}>
                  <CategoryCard category={category} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
