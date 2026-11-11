"use client";

import { useState } from "react";

import { errorMessage } from "@/features/admin/api";
import { Card, ErrorState, Skeleton } from "@/features/admin/ui";
import { useApiData } from "@/features/admin/use-api";
import { cn } from "@/lib/format";
import type { CountItem, SiteAnalytics } from "@/types/api";

const PERIODS = [7, 30, 90] as const;
const number = new Intl.NumberFormat("en");
const dayLabel = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", options);

/** Dashboard section: page views and visitors on the public site. */
export function SiteVisits() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const { data, error, reload } = useApiData<SiteAnalytics>(`/admin/analytics?days=${days}`);

  return (
    <section aria-labelledby="visits">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="visits" className="font-semibold">
            Site visits
          </h2>
          <p className="mt-0.5 text-xs text-fg-subtle">
            No cookies and nothing that identifies a visitor. Each person counts once per day; bots, your own
            visits while signed in, and visitors who turn on Do Not Track are left out.
          </p>
        </div>
        <div role="group" aria-label="Period" className="flex rounded-lg border border-line bg-surface p-0.5 text-sm">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => setDays(period)}
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                days === period ? "bg-surface-muted font-medium text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {period} days
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : !data ? (
        <Skeleton rows={3} />
      ) : (
        <div className="space-y-3">
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Visitors today", value: data.visitors_today },
              { label: "Page views today", value: data.views_today },
              { label: `Visitors, last ${data.days} days`, value: data.visitors },
              { label: `Page views, last ${data.days} days`, value: data.views },
              { label: "Page views, all time", value: data.views_all_time },
            ].map((tile) => (
              <li key={tile.label} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-sm text-fg-muted">{tile.label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{number.format(tile.value)}</p>
              </li>
            ))}
          </ul>

          <Card className="p-4">
            <DailyChart data={data} />
          </Card>

          <div className="grid gap-3 lg:grid-cols-3">
            <TopList title="Most viewed pages" items={data.top_pages} empty="No page views yet." />
            <TopList
              title="Where visitors came from"
              items={data.top_referrers}
              empty="No referring sites yet. Visits from links (LinkedIn, Google, GitHub…) appear here."
            />
            <TopList title="Devices" items={data.devices} empty="No visits yet." capitalize />
          </div>
        </div>
      )}
    </section>
  );
}

function DailyChart({ data }: { data: SiteAnalytics }) {
  const max = Math.max(1, ...data.daily.map((d) => d.views));
  const busiest = data.daily.reduce((a, b) => (b.views > a.views ? b : a), data.daily[0]);
  const width = 720;
  const height = 160;
  const gap = data.days > 60 ? 1 : 3;
  const bar = (width - gap * (data.days - 1)) / data.days;

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">Page views per day</span>
        <span className="text-xs text-fg-subtle">
          {busiest && busiest.views > 0
            ? `Busiest: ${dayLabel(busiest.date, { day: "numeric", month: "short" })}, ${number.format(busiest.views)} views`
            : "No visits in this period yet"}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height + 18}`} className="h-auto w-full" role="img" aria-label={`Page views per day for the last ${data.days} days`}>
        <line x1="0" x2={width} y1={height} y2={height} className="stroke-line" />
        {data.daily.map((day, i) => {
          const h = (day.views / max) * (height - 8);
          const x = i * (bar + gap);
          return (
            <g key={day.date}>
              <title>{`${dayLabel(day.date, { weekday: "short", day: "numeric", month: "short" })}: ${day.views} views, ${day.visitors} visitors`}</title>
              {/* Invisible full-height target so short bars are easy to hover. */}
              <rect x={x} y={0} width={bar} height={height} fill="transparent" />
              <rect x={x} y={height - h} width={bar} height={h} rx={Math.min(3, bar / 3)} className="fill-accent" opacity={0.85} />
            </g>
          );
        })}
        <text x="0" y={height + 14} className="fill-fg-subtle text-[11px]">
          {dayLabel(data.daily[0].date, { day: "numeric", month: "short" })}
        </text>
        <text x={width} y={height + 14} textAnchor="end" className="fill-fg-subtle text-[11px]">
          Today
        </text>
      </svg>
    </figure>
  );
}

function TopList({ title, items, empty, capitalize }: { title: string; items: CountItem[]; empty: string; capitalize?: boolean }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-fg-subtle">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.label} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className={cn("min-w-0 truncate text-fg", capitalize && "capitalize")}>{item.label}</span>
                <span className="shrink-0 font-mono text-xs text-fg-muted">{number.format(item.count)}</span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${(item.count / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
