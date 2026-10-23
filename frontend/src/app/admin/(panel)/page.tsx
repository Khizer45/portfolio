"use client";

import { ExternalLink, Plus, UserRound } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { errorMessage } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { useApiData } from "@/features/admin/use-api";
import { AdminPageHeader, Card, ErrorState, Skeleton, describeChange, formatTimestamp } from "@/features/admin/ui";
import type { DashboardStats } from "@/types/api";

export default function DashboardPage() {
  const auth = useAuth();
  const { data: stats, error, reload } = useApiData<DashboardStats>("/admin/stats");

  const name = auth.status === "authenticated" ? auth.user.display_name.split(" ")[0] : "";
  const cards = stats
    ? [
        { label: "Published projects", value: stats.projects_published, href: "/admin/projects", note: `${stats.projects_featured} featured` },
        { label: "Draft projects", value: stats.projects_draft, href: "/admin/projects", note: "Not visible to visitors" },
        { label: "Skills", value: stats.skills, href: "/admin/skills", note: stats.skills_hidden ? `${stats.skills_hidden} hidden` : "All visible" },
        { label: "Experience entries", value: stats.experiences, href: "/admin/experience" },
        { label: "Certifications", value: stats.certifications, href: "/admin/certifications" },
        { label: "Education entries", value: stats.education, href: "/admin/education" },
        { label: "Articles", value: stats.articles_published, href: "/admin/articles", note: `${stats.articles_draft} draft${stats.articles_draft === 1 ? "" : "s"}` },
        { label: "Awards & publications", value: stats.achievements, href: "/admin/achievements" },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title={name ? `Welcome back, ${name}` : "Dashboard"}
        documentTitle="Dashboard"
        description="Everything here is read from the database. Changes appear on the public site within moments."
        actions={
          <>
            <a href="/" target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <ExternalLink aria-hidden="true" /> View site
            </a>
            <Link href="/admin/profile" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <UserRound aria-hidden="true" /> Edit profile
            </Link>
            <Link href="/admin/projects/new" className={buttonClasses({ size: "sm" })}>
              <Plus aria-hidden="true" /> New project
            </Link>
          </>
        }
      />

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : !stats ? (
        <Skeleton rows={4} />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="totals">
            <h2 id="totals" className="sr-only">
              Totals
            </h2>
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {cards.map((card) => (
                <li key={card.label}>
                  <Link href={card.href} className="block h-full rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                    <p className="text-sm text-fg-muted">{card.label}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">{card.value}</p>
                    {card.note && <p className="mt-1 text-xs text-fg-subtle">{card.note}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="recent">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="recent" className="font-semibold">
                Recent changes
              </h2>
              <Link href="/admin/activity" className="text-sm text-accent hover:text-accent-hover">
                Full activity log
              </Link>
            </div>
            <Card>
              {stats.recent_changes.length === 0 ? (
                <p className="p-5 text-sm text-fg-muted">No changes yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {stats.recent_changes.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-fg">{describeChange(entry.action, entry.entity_type, entry.entity_label)}</span>
                      <span className="shrink-0 text-xs text-fg-subtle">
                        {entry.actor ? `${entry.actor} · ` : ""}
                        <time dateTime={entry.created_at}>{formatTimestamp(entry.created_at)}</time>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
