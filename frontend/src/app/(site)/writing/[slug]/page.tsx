import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ArrowLink } from "@/components/ui/arrow-link";
import { Tag } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { getArticle, getProfile, getPublishedArticles } from "@/lib/content";
import { formatDay } from "@/lib/format";
import type { Article } from "@/types/api";

export const revalidate = 300;

/** Only articles hosted here get a page; external ones link out from the writing list. */
export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.filter((article) => !article.external_url).map((article) => ({ slug: article.slug }));
}

async function getLocalArticle(slug: string): Promise<Article | null> {
  const article = await getArticle(slug);
  return article && !article.external_url ? article : null;
}

export async function generateMetadata({ params }: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [article, profile] = await Promise.all([getLocalArticle(slug), getProfile()]);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/writing/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      url: `/writing/${article.slug}`,
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
      modifiedTime: article.updated_at,
      authors: [profile.display_name],
      tags: article.tags,
    },
  };
}

export default async function ArticlePage({ params }: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const article = await getLocalArticle(slug);
  if (!article) notFound();

  const publishedAt = article.published_at;
  const published = publishedAt?.slice(0, 10);
  const updated = article.updated_at.slice(0, 10);
  const related = article.related_project;

  return (
    <article>
      <Container narrow className="py-12 sm:py-16">
        <Link href="/writing" className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden="true" /> All writing
        </Link>
        <header className="mt-8 border-b border-line pb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-tight">
            {article.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-fg-muted">{article.summary}</p>
          <p className="mt-6 font-mono text-sm text-fg-subtle">
            {publishedAt && published && (
              <>
                <time dateTime={publishedAt}>{formatDay(published)}</time>
                {updated > published && (
                  <>
                    {" · Updated "}
                    <time dateTime={article.updated_at}>{formatDay(updated)}</time>
                  </>
                )}
                {" · "}
              </>
            )}
            {`${article.reading_minutes} min read`}
          </p>
          {article.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
              {article.tags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
          )}
        </header>
        {/* Markdown is rendered without raw HTML support: any HTML in the source is escaped, and unsafe
            link protocols (e.g. javascript:) are removed by react-markdown's default URL transform. */}
        <div className="prose-article mt-10">
          <Markdown remarkPlugins={[remarkGfm]}>{article.content}</Markdown>
        </div>
        {related && (
          <footer className="mt-14 border-t border-line pt-8">
            <h2 className="font-mono text-xs tracking-[0.14em] text-fg-subtle uppercase">Related project</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <ArrowLink href={`/projects/${related.slug}`}>{related.title}</ArrowLink>
              </li>
            </ul>
          </footer>
        )}
      </Container>
    </article>
  );
}
