import { ArrowLeft, ArrowRight, FileClock, Info, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ImagePlaceholder, ProjectImageView } from "@/components/projects/project-cover";
import { BulletList, DetailSection, FeatureList, ProjectLinks } from "@/components/projects/project-details";
import { ArrowLink } from "@/components/ui/arrow-link";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { getProject, getProjects } from "@/lib/content";
import { formatDay, formatRange } from "@/lib/format";
import { projectStatusMeta } from "@/lib/labels";
import { getDiagrams, getScreenshots, hasProjectLinks } from "@/lib/project-utils";

export const revalidate = 300;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  const title = project.subtitle ? `${project.title} — ${project.subtitle}` : project.title;
  return {
    title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { type: "article", title, description: project.summary, url: `/projects/${project.slug}` },
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const [project, projects] = await Promise.all([getProject(slug), getProjects()]);
  if (!project) notFound();

  const status = projectStatusMeta[project.status];
  const primary = project.category;
  const cover = project.cover_image;
  const gallery = getScreenshots(project).filter((image) => image.url !== cover?.url);
  const diagrams = getDiagrams(project).filter((image) => image.url !== cover?.url);
  const timeline = formatRange(project.start_date ?? undefined, project.end_date ?? undefined, "Ongoing");
  const index = projects.findIndex((p) => p.slug === project.slug);
  const previous = index > 0 ? projects[index - 1] : undefined;
  const next = index >= 0 ? projects[index + 1] : undefined;
  const related = project.related_articles;
  const hasLinks = hasProjectLinks(project);
  const hasNotice = Boolean(project.notice_title || project.notice_body);

  const caseStudyPending =
    project.decisions.length === 0 && project.challenges.length === 0 && project.lessons.length === 0;

  return (
    <article>
      <header className="border-b border-line">
        <Container className="py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-fg-subtle">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/projects" className="inline-flex items-center gap-1.5 hover:text-fg">
                  <ArrowLeft className="size-4" aria-hidden="true" /> All projects
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/projects/category/${primary.slug}`} className="hover:text-fg">
                  {primary.short_title}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-fg-muted">
                {project.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={status.label} tone={status.tone} title={status.description} />
            {project.label && <span className="text-sm font-medium text-fg-subtle">{project.label}</span>}
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{project.title}</h1>
          {project.subtitle && <p className="mt-2 text-xl text-fg-muted sm:text-2xl">{project.subtitle}</p>}
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-pretty text-fg-muted">{project.summary}</p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <div>
              <dt className="text-fg-subtle">Status</dt>
              <dd className="mt-1 text-fg">{status.description}</dd>
            </div>
            {project.subcategory && (
              <div>
                <dt className="text-fg-subtle">Focus</dt>
                <dd className="mt-1 text-fg">{project.subcategory}</dd>
              </div>
            )}
            {timeline && (
              <div>
                <dt className="text-fg-subtle">Timeline</dt>
                <dd className="mt-1 font-mono text-fg">{timeline}</dd>
              </div>
            )}
            {project.role && (
              <div>
                <dt className="text-fg-subtle">Role</dt>
                <dd className="mt-1 text-fg">{project.role}</dd>
              </div>
            )}
          </dl>

          <div className="mt-8">
            {hasLinks ? (
              <ProjectLinks project={project} />
            ) : (
              <p className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-3.5 py-2 text-sm text-fg-muted">
                <FileClock className="size-4 text-fg-subtle" aria-hidden="true" />
                Repository and demo links will be added when published.
              </p>
            )}
          </div>
        </Container>
      </header>

      <Container className="py-12 sm:py-16">
        <figure className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className={cover ? "aspect-[16/9]" : "h-44 sm:h-56"}>
            {cover ? (
              <ProjectImageView image={cover} eager />
            ) : (
              <ImagePlaceholder icon={primary.icon} label="Screenshots coming soon" />
            )}
          </div>
          {cover?.caption && (
            <figcaption className="border-t border-line px-5 py-3 text-sm text-fg-subtle">{cover.caption}</figcaption>
          )}
        </figure>

        {hasNotice && (
          <aside role="note" className="mt-8 flex gap-4 rounded-xl border border-tone-amber/30 bg-tone-amber/[0.06] p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-tone-amber" aria-hidden="true" />
            <div>
              {project.notice_title && <p className="font-medium text-fg">{project.notice_title}</p>}
              {project.notice_body && (
                <p className={project.notice_title ? "mt-1 text-sm leading-relaxed text-fg-muted" : "text-sm leading-relaxed text-fg-muted"}>
                  {project.notice_body}
                </p>
              )}
            </div>
          </aside>
        )}

        <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <div className="space-y-14">
            {project.description && (
              <DetailSection id="overview" title="Overview">
                {/* Admin-authored Markdown. Raw HTML stays escaped and unsafe link
                    protocols are removed by react-markdown's default URL transform. */}
                <div className="prose-article">
                  <Markdown remarkPlugins={[remarkGfm]}>{project.description}</Markdown>
                </div>
              </DetailSection>
            )}

            {project.problem && (
              <DetailSection id="problem" title="The problem">
                <p className="leading-relaxed text-pretty text-fg-muted">{project.problem}</p>
              </DetailSection>
            )}

            {project.features.length > 0 && (
              <DetailSection id="features" title="Features">
                <FeatureList features={project.features} />
              </DetailSection>
            )}

            {project.contribution.length > 0 && (
              <DetailSection id="contribution" title="My contribution">
                <BulletList items={project.contribution} />
              </DetailSection>
            )}

            {project.implementation.length > 0 && (
              <DetailSection id="implementation" title="Technical implementation">
                <BulletList items={project.implementation} />
              </DetailSection>
            )}

            {(project.architecture || diagrams.length > 0) && (
              <DetailSection id="architecture" title="Architecture">
                {project.architecture && <p className="leading-relaxed text-fg-muted">{project.architecture}</p>}
                {diagrams.map((diagram) => (
                  <figure key={diagram.url} className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
                    <ProjectImageView image={diagram} className="object-contain" />
                    {diagram.caption && (
                      <figcaption className="border-t border-line px-4 py-2.5 text-sm text-fg-subtle">
                        {diagram.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </DetailSection>
            )}

            {project.decisions.length > 0 && (
              <DetailSection id="decisions" title="Key engineering decisions">
                <dl className="space-y-5">
                  {project.decisions.map((decision) => (
                    <div key={decision.title} className="rounded-xl border border-line bg-surface p-5">
                      <dt className="font-medium text-fg">{decision.title}</dt>
                      <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{decision.detail}</dd>
                    </div>
                  ))}
                </dl>
              </DetailSection>
            )}

            {project.challenges.length > 0 && (
              <DetailSection id="challenges" title="Challenges">
                <BulletList items={project.challenges} />
              </DetailSection>
            )}

            {project.lessons.length > 0 && (
              <DetailSection id="lessons" title="Lessons learned">
                <BulletList items={project.lessons} />
              </DetailSection>
            )}

            {(project.results.length > 0 || project.evaluation_note) && (
              <DetailSection id="results" title="Results & evaluation">
                {project.results.length > 0 ? (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {project.results.map((metric) => (
                      <li key={metric.label} className="rounded-xl border border-line bg-surface p-5">
                        <p className="text-3xl font-semibold tracking-tight text-fg">{metric.value}</p>
                        <p className="mt-1 text-sm font-medium text-fg-muted">{metric.label}</p>
                        {metric.context && <p className="mt-3 text-xs leading-relaxed text-fg-subtle">{metric.context}</p>}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {project.evaluation_note && (
                  <p
                    className={
                      project.results.length > 0
                        ? "mt-5 text-sm text-fg-subtle"
                        : "flex gap-3 rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-fg-muted"
                    }
                  >
                    {project.results.length === 0 && (
                      <Info className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                    )}
                    <span>{project.evaluation_note}</span>
                  </p>
                )}
              </DetailSection>
            )}

            {project.next_steps.length > 0 && (
              <DetailSection id="next-steps" title="Next steps">
                <BulletList items={project.next_steps} />
              </DetailSection>
            )}

            {caseStudyPending && (
              <p className="flex gap-3 rounded-xl border border-dashed border-line-strong p-5 text-sm leading-relaxed text-fg-muted">
                <FileClock className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <span>
                  A detailed case study — engineering decisions, challenges, and lessons learned — is being written and will
                  be added here.
                </span>
              </p>
            )}

            {gallery.length > 0 && (
              <DetailSection id="screenshots" title="Screenshots">
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {gallery.map((image) => (
                    <li key={image.url}>
                      <figure className="overflow-hidden rounded-xl border border-line bg-surface">
                        <ProjectImageView image={image} />
                        {image.caption && (
                          <figcaption className="border-t border-line px-4 py-2.5 text-sm text-fg-subtle">
                            {image.caption}
                          </figcaption>
                        )}
                      </figure>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {related.length > 0 && (
              <DetailSection id="writing" title="Related writing">
                <ul className="space-y-3">
                  {related.map((article) => (
                    <li key={article.slug}>
                      <ArrowLink href={article.external_url ?? `/writing/${article.slug}`} external={Boolean(article.external_url)}>
                        {article.title}
                      </ArrowLink>
                      {article.published_at && (
                        <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                          <time dateTime={article.published_at}>{formatDay(article.published_at.slice(0, 10))}</time>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}
          </div>

          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start" aria-label="Project details">
            {project.technologies.length > 0 && (
              <div>
                <h2 className="font-mono text-xs tracking-[0.14em] text-fg-subtle uppercase">Tech stack</h2>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <li key={tech}>
                      <Link href={`/projects?tech=${encodeURIComponent(tech)}`} className="rounded-md">
                        <Tag className="transition-colors hover:border-line-strong hover:text-fg">{tech}</Tag>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h2 className="font-mono text-xs tracking-[0.14em] text-fg-subtle uppercase">Categories</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {project.categories.map((category) => (
                  <li key={category.slug}>
                    <Link href={`/projects/category/${category.slug}`} className="text-fg-muted hover:text-accent">
                      {category.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {hasLinks && (
              <div>
                <h2 className="font-mono text-xs tracking-[0.14em] text-fg-subtle uppercase">Links</h2>
                <div className="mt-3">
                  <ProjectLinks project={project} size="sm" />
                </div>
              </div>
            )}
          </aside>
        </div>

        {(previous || next) && (
          <nav aria-label="More projects" className="mt-20 grid gap-4 border-t border-line pt-10 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/projects/${previous.slug}`}
                className="group rounded-xl border border-line p-5 transition-colors hover:border-line-strong"
              >
                <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous project
                </span>
                <span className="mt-2 block font-medium text-fg group-hover:text-accent">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/projects/${next.slug}`}
                className="group rounded-xl border border-line p-5 text-right transition-colors hover:border-line-strong"
              >
                <span className="flex items-center justify-end gap-1.5 text-xs text-fg-subtle">
                  Next project <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-2 block font-medium text-fg group-hover:text-accent">{next.title}</span>
              </Link>
            )}
          </nav>
        )}
        <Link
          href="/projects"
          className="mt-10 inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to all projects
        </Link>
      </Container>
    </article>
  );
}
