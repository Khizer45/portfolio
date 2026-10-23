"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { site } from "@/data/site";
import { cn } from "@/lib/format";

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center gap-3 text-sm text-fg-muted", className)}>
      <Loader2 className="size-5 animate-spin text-accent" aria-hidden="true" />
      <span>{label ?? "Loading…"}</span>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function AdminPageHeader({
  title,
  documentTitle = title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  /** Defaults to `title`. A distinct title per screen lets Next.js announce client-side route changes. */
  documentTitle?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      {/* React hoists this into <head>; the most recently mounted <title> wins over the layout's metadata. */}
      <title>{`${documentTitle} · Admin · ${site.ownerName}`}</title>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2 text-sm text-fg-subtle">{breadcrumb}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-tone-amber/30 bg-tone-amber/[0.06] p-5 text-sm">
      <p className="flex items-center gap-2 font-medium text-fg">
        <AlertTriangle className="size-4 text-tone-amber" aria-hidden="true" /> {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-md border border-line-strong bg-surface px-3 py-1.5 font-medium hover:bg-surface-muted">
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
      ))}
    </div>
  );
}

/** Draft / published / hidden indicator. Text always carries the meaning. */
export function StateBadge({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        on ? "border-tone-emerald/30 bg-tone-emerald/10 text-fg" : "border-line-strong bg-surface-muted text-fg-muted",
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", on ? "bg-tone-emerald" : "bg-tone-neutral")} />
      {on ? onLabel : offLabel}
    </span>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const button =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium disabled:opacity-40 hover:bg-surface-muted";
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-4 text-sm text-fg-muted">
      <p>
        Page {page} of {pages} · {total} items
      </p>
      <div className="flex gap-2">
        <button type="button" className={button} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </button>
        <button type="button" className={button} disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-21T08:15:00Z" → "21 Oct 2026, 08:15" in the viewer's local time. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${time}`;
}

const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  publish: "Published",
  unpublish: "Unpublished",
  feature: "Featured",
  unfeature: "Unfeatured",
  show: "Showed",
  hide: "Hid",
  reorder: "Reordered",
  password_change: "Changed password",
};

/** "Updated project: Local AI Lab" for the dashboard and activity log. */
export function describeChange(action: string, entityType: string, label: string | null) {
  const what = entityType.replace(/_/g, " ");
  return `${ACTION_LABEL[action] ?? action} ${what}${label ? `: ${label}` : ""}`;
}
