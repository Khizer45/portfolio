import { ArrowUpRight, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Tag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getPublishedArticles } from "@/lib/content";
import { formatDay, hostname } from "@/lib/format";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Technical writing by Khizer Hayat: tutorials, project architecture, benchmarking methodology, and lessons learned.",
  alternates: { canonical: "/writing" },
};

export const revalidate = 300;

export default async function WritingPage() {
  const articles = await getPublishedArticles();

  return (
    <>
      <PageHeader
        eyebrow="Writing"
        title="Writing"
        description="Technical notes from building projects: tutorials, architecture, benchmarking methodology, deployment, and lessons learned."
      />
      <Container className="py-12 sm:py-16">
        {articles.length > 0 ? (
          <ul className="divide-y divide-line border-y border-line">
            {articles.map((article) => {
              const href = article.external_url ?? `/writing/${article.slug}`;
              const external = Boolean(article.external_url);
              return (
                <li key={article.slug} className="group relative grid gap-2 py-7 sm:grid-cols-[9rem_1fr] sm:gap-8">
                  <p className="font-mono text-sm text-fg-subtle">
                    {article.published_at && (
                      <time dateTime={article.published_at}>{formatDay(article.published_at.slice(0, 10))}</time>
                    )}
                  </p>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {external ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0 group-hover:text-accent">
                          {article.title}
                          <ArrowUpRight className="ml-1 inline size-4 text-fg-subtle" aria-hidden="true" />
                          <span className="sr-only"> (opens on {hostname(href)})</span>
                        </a>
                      ) : (
                        <Link href={href} className="after:absolute after:inset-0 group-hover:text-accent">
                          {article.title}
                        </Link>
                      )}
                    </h2>
                    <p className="mt-2 leading-relaxed text-fg-muted">{article.summary}</p>
                    {(article.tags.length > 0 || external) && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
                        {article.tags.map((tag) => (
                          <li key={tag}>
                            <Tag>{tag}</Tag>
                          </li>
                        ))}
                        {external && <li className="text-xs leading-6 text-fg-subtle">on {hostname(href)}</li>}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={PenLine}
            title="Articles coming soon"
            description="I'm preparing write-ups on project architecture, model benchmarking, and deployment. They will be published here."
          >
            <ButtonLink href="/projects" variant="secondary" size="sm">
              Browse projects
            </ButtonLink>
          </EmptyState>
        )}
      </Container>
    </>
  );
}
