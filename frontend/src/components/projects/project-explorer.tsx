"use client";

import { ChevronDown, Search, SearchX, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ProjectGrid } from "@/components/projects/project-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/format";
import { projectStatusMeta } from "@/lib/labels";
import type { ProjectStatus, ProjectSummary } from "@/types/api";

type Filters = { q: string; category: string; status: string; tech: string };

const EMPTY_FILTERS: Filters = { q: "", category: "all", status: "all", tech: "all" };

type ExplorerProps = {
  projects: ProjectSummary[];
  /** Categories that have at least one project. */
  categoryOptions: Array<{ slug: string; label: string; count: number }>;
  statusOptions: ProjectStatus[];
  technologyOptions: string[];
};

/** Reads filters from the URL, ignoring values that don't match any option. */
function readFilters(params: URLSearchParams, options: ExplorerProps): Filters {
  const pick = (key: string, allowed: readonly string[]) => {
    const value = params.get(key);
    return value && allowed.includes(value) ? value : "all";
  };
  return {
    q: params.get("q") ?? "",
    category: pick("category", options.categoryOptions.map((c) => c.slug)),
    status: pick("status", options.statusOptions),
    tech: pick("tech", options.technologyOptions),
  };
}

function writeFilters(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.tech !== "all") params.set("tech", filters.tech);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

/** Reads initial filters from the URL (e.g. /projects?category=mlops). */
export function ProjectExplorer(props: ExplorerProps) {
  const searchParams = useSearchParams();
  return <Explorer {...props} initialFilters={readFilters(new URLSearchParams(searchParams.toString()), props)} />;
}

/** Server-rendered version used while the URL is read on the client. */
export function ProjectExplorerFallback(props: ExplorerProps) {
  return <Explorer {...props} initialFilters={EMPTY_FILTERS} />;
}

function Explorer({
  projects,
  categoryOptions,
  statusOptions,
  technologyOptions,
  initialFilters,
}: ExplorerProps & { initialFilters: Filters }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const searchIndex = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.slug,
          [
            project.title,
            project.subtitle,
            project.summary,
            project.label,
            projectStatusMeta[project.status].label,
            ...project.technologies,
            ...project.categories.flatMap((c) => [c.title, c.short_title]),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        ]),
      ),
    [projects],
  );

  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = projects.filter(
    (project) =>
      (filters.category === "all" || project.categories.some((c) => c.slug === filters.category)) &&
      (filters.status === "all" || project.status === filters.status) &&
      (filters.tech === "all" || project.technologies.includes(filters.tech)) &&
      terms.every((term) => searchIndex.get(project.slug)!.includes(term)),
  );

  const hasFilters =
    filters.q.trim() !== "" || filters.category !== "all" || filters.status !== "all" || filters.tech !== "all";

  function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    writeFilters(next);
  }

  function clear() {
    setFilters(EMPTY_FILTERS);
    writeFilters(EMPTY_FILTERS);
  }

  return (
    <div>
      <div role="search" aria-label="Filter projects" className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative md:col-span-2 lg:col-span-1">
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input
            id="project-search"
            type="search"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Search by name, technology, or topic"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-10 text-[0.9375rem] text-fg placeholder:text-fg-subtle hover:border-fg-subtle focus-visible:border-accent"
          />
        </div>
        <FilterSelect
          id="filter-category"
          label="Category"
          value={filters.category}
          onChange={(value) => update({ category: value })}
          allLabel="All categories"
          options={categoryOptions.map((c) => ({ value: c.slug, label: `${c.label} (${c.count})` }))}
        />
        <FilterSelect
          id="filter-status"
          label="Status"
          value={filters.status}
          onChange={(value) => update({ status: value })}
          allLabel="Any status"
          options={statusOptions.map((s) => ({ value: s, label: projectStatusMeta[s].label }))}
        />
        <FilterSelect
          id="filter-tech"
          label="Technology"
          value={filters.tech}
          onChange={(value) => update({ tech: value })}
          allLabel="All technologies"
          options={technologyOptions.map((t) => ({ value: t, label: t }))}
        />
      </div>

      <div className="mt-5 mb-6 flex min-h-8 items-center justify-between gap-4 text-sm">
        <p aria-live="polite" className="text-fg-muted">
          Showing <span className="font-medium text-fg">{results.length}</span> of {projects.length}{" "}
          {projects.length === 1 ? "project" : "projects"}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <ProjectGrid projects={results} headingLevel="h2" />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No projects match these filters"
          description="Try a different search term, or clear the filters to see every project."
        >
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-surface-muted"
          >
            Clear filters
          </button>
        </EmptyState>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
}) {
  const active = value !== "all";
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-11 w-full appearance-none rounded-lg border bg-surface pr-9 pl-3.5 text-[0.9375rem] text-fg hover:border-fg-subtle focus-visible:border-accent",
          active ? "border-accent-line bg-accent-soft" : "border-line-strong",
        )}
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
    </div>
  );
}
