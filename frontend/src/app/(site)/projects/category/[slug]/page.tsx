import { FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryCard } from "@/components/projects/category-card";
import { ProjectGrid } from "@/components/projects/project-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/page-header";
import { getCategories, getProjectsInCategory } from "@/lib/content";

export const revalidate = 300;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

async function getCategory(slug: string) {
  const categories = await getCategories();
  return { category: categories.find((c) => c.slug === slug), categories };
}

export async function generateMetadata({ params }: PageProps<"/projects/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.title} projects`,
    description: category.description,
    alternates: { canonical: `/projects/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/projects/category/[slug]">) {
  const { slug } = await params;
  const { category, categories } = await getCategory(slug);
  if (!category) notFound();

  // Fetched only for a known category: the API rejects malformed slugs, which would otherwise error instead of 404.
  const projects = await getProjectsInCategory(category.slug);
  const others = categories.filter((c) => c.slug !== category.slug && c.project_count > 0).slice(0, 6);

  return (
    <>
      <header className="border-b border-line">
        <Container className="py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-subtle">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/projects" className="hover:text-fg">
                  Projects
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-fg-muted">
                {category.short_title}
              </li>
            </ol>
          </nav>
          <div className="flex items-start gap-5">
            <span className="hidden size-14 shrink-0 place-items-center rounded-2xl border border-accent-line bg-accent-soft text-accent sm:grid">
              <CategoryIcon name={category.icon} className="size-6" />
            </span>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{category.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-muted">{category.description}</p>
            </div>
          </div>
          {category.focus_areas.length > 0 && (
            <div className="mt-10 sm:pl-[4.75rem]">
              <h2 className="font-mono text-xs tracking-[0.14em] text-fg-subtle uppercase">What this covers</h2>
              <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm text-fg-muted sm:grid-cols-2">
                {category.focus_areas.map((area) => (
                  <li key={area} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.6em] size-1 shrink-0 rounded-full bg-accent" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Container>
      </header>

      <section aria-labelledby="category-projects" className="py-12 sm:py-16">
        <Container>
          <h2 id="category-projects" className="sr-only">
            Projects in {category.title}
          </h2>
          {projects.length > 0 ? (
            <ProjectGrid projects={projects} />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Projects coming soon"
              description={`I haven't published a ${category.short_title.toLowerCase()} project yet. Projects will appear here as they are completed.`}
            >
              <ButtonLink href="/projects" variant="secondary" size="sm">
                See all projects
              </ButtonLink>
            </EmptyState>
          )}
        </Container>
      </section>

      {others.length > 0 && (
        <section aria-labelledby="other-categories" className="border-t border-line py-14">
          <Container>
            <SectionHeading id="other-categories" title="Other categories" />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => (
                <li key={other.slug}>
                  <CategoryCard category={other} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
