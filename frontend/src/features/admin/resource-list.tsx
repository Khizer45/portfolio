"use client";

import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { api, errorMessage, revalidatePublicSite } from "@/features/admin/api";
import { useConfirm } from "@/features/admin/confirm";
import { inputClass } from "@/features/admin/form/fields";
import type { ResourceDef } from "@/features/admin/resources";
import { useToast } from "@/features/admin/toast";
import { useApiData } from "@/features/admin/use-api";
import { AdminPageHeader, ErrorState, Pagination, Skeleton, StateBadge } from "@/features/admin/ui";
import { cn } from "@/lib/format";
import type { AdminRecord, Page } from "@/types/api";

const PAGE_SIZE = 50;

export function ResourceList({ resource }: { resource: ResourceDef }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const listPath = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (query) params.set("search", query);
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return `${resource.endpoint}?${params}`;
  }, [resource.endpoint, page, query, filters]);
  const { data, error, reload } = useApiData<Page<AdminRecord>>(listPath);

  // `data` keeps the previous response until the next one arrives, so remember which response was
  // showing when a new one was requested: until it is replaced it may belong to another page or
  // filter, or show the old order, and row actions stay disabled.
  const [stale, setStale] = useState<{ path: string; data: Page<AdminRecord> | null }>({ path: listPath, data: null });
  if (stale.path !== listPath) setStale({ path: listPath, data });
  const fresh = data !== null && data !== stale.data && stale.path === listPath;
  const ready = fresh && busy === null;
  function refresh() {
    setStale((s) => ({ ...s, data }));
    reload();
  }

  // A page past the end (e.g. after deleting the last item on it): go to the last page.
  if (data && fresh && data.items.length === 0 && data.page > 1) setPage(Math.max(1, Math.min(data.pages, data.page - 1)));

  // Moving a row re-inserts it in the DOM, which drops focus from its arrow: put it back after the reload.
  const listRef = useRef<HTMLUListElement>(null);
  const moved = useRef<{ id: string; delta: number } | null>(null);
  useEffect(() => {
    if (!moved.current || !fresh) return;
    const { id, delta } = moved.current;
    moved.current = null;
    const arrows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>(`[data-move="${id}"]`) ?? []);
    if (document.activeElement !== document.body && !arrows.some((b) => b === document.activeElement)) return;
    if (delta > 0) arrows.reverse();
    arrows.find((b) => !b.disabled)?.focus();
  }, [data, fresh]);

  const filtered = Boolean(query) || Object.values(filters).some(Boolean);
  // Reordering rewrites positions for the listed items, so it needs the full, unfiltered list.
  const canReorder = resource.reorderable && !filtered && data !== null && data.pages === 1;

  // Row buttons use aria-disabled rather than disabled while busy, so the one just pressed keeps focus.
  async function toggle(item: AdminRecord, index: number) {
    if (!ready) return;
    const def = resource.toggles![index];
    const next = !def.isOn(item);
    setBusy(`${item.id}:${index}`);
    try {
      await api.patch(`${resource.endpoint}/${item.id}`, def.body(next));
      toast.success(`${resource.titleOf(item)}: ${next ? def.onText : def.offText}.`);
      revalidatePublicSite();
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: AdminRecord) {
    if (!ready) return;
    const ok = await confirm({
      title: `Delete ${resource.singular}?`,
      message: (
        <>
          <strong className="text-fg">{resource.titleOf(item)}</strong> will be permanently deleted. This cannot be undone.
        </>
      ),
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusy(`${item.id}:delete`);
    try {
      await api.delete(`${resource.endpoint}/${item.id}`);
      toast.success(`Deleted ${resource.titleOf(item)}.`);
      revalidatePublicSite();
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function move(index: number, delta: number) {
    if (!data || !ready) return;
    const ids = data.items.map((i) => i.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id);
    setBusy("reorder");
    try {
      await api.post(`${resource.endpoint}/reorder`, { ids });
      revalidatePublicSite();
      moved.current = { id, delta };
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const iconButton = "grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg disabled:opacity-30 aria-disabled:opacity-30";

  return (
    <div>
      <AdminPageHeader
        title={resource.title}
        description={resource.description}
        actions={
          <Link href={`/admin/${resource.key}/new`} className={buttonClasses({ size: "sm" })}>
            <Plus aria-hidden="true" /> New {resource.singular}
          </Link>
        }
      />

      <div role="search" className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="admin-search" className="sr-only">
            Search {resource.title.toLowerCase()}
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input
            id="admin-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${resource.title.toLowerCase()}`}
            className={cn(inputClass, "h-10 pl-9")}
          />
        </div>
        {resource.filters?.map((filter) => (
          <div key={filter.param}>
            <label htmlFor={`filter-${filter.param}`} className="sr-only">
              {filter.label}
            </label>
            <select
              id={`filter-${filter.param}`}
              value={filters[filter.param] ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, [filter.param]: e.target.value }));
                setPage(1);
              }}
              className={cn(inputClass, "h-10 sm:w-44")}
            >
              <option value="">All ({filter.label.toLowerCase()})</option>
              {filter.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : data === null || (data.items.length === 0 && data.page > 1) ? (
        <Skeleton />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filtered ? `No ${resource.title.toLowerCase()} match your search` : `No ${resource.title.toLowerCase()} yet`}
          description={filtered ? "Try a different search or clear the filters." : `Create your first ${resource.singular} to show it on the site.`}
        >
          {!filtered && (
            <Link href={`/admin/${resource.key}/new`} className={buttonClasses({ size: "sm" })}>
              <Plus aria-hidden="true" /> New {resource.singular}
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 text-xs text-fg-subtle" aria-live="polite">
            {data.total} {data.total === 1 ? resource.singular : resource.title.toLowerCase()}
            {resource.reorderable && !canReorder && filtered ? " · clear the search to reorder" : ""}
          </p>
          <ul ref={listRef} className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {data.items.map((item, index) => {
              const href = resource.publicHref?.(item);
              return (
                <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/${resource.key}/${item.id}`} className="font-medium text-fg hover:text-accent">
                      {resource.titleOf(item) || "(untitled)"}
                    </Link>
                    {resource.subtitleOf?.(item) && <p className="truncate text-sm text-fg-subtle">{resource.subtitleOf(item)}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {resource.columns.map((column) => (
                      <div key={column.label} className={cn(column.secondary && "hidden md:block")} title={column.label}>
                        {column.render(item)}
                      </div>
                    ))}
                    {resource.toggles?.map((def, toggleIndex) => (
                      <button
                        key={def.label}
                        type="button"
                        onClick={() => toggle(item, toggleIndex)}
                        aria-disabled={!ready}
                        aria-label={`${def.label}: ${def.isOn(item) ? def.onText : def.offText}. Click to change.`}
                        className="rounded-full aria-disabled:opacity-50"
                      >
                        <StateBadge on={def.isOn(item)} onLabel={def.onText} offLabel={def.offText} />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-0.5 sm:ml-2">
                    {canReorder && (
                      <>
                        <button type="button" className={iconButton} data-move={item.id} disabled={index === 0} aria-disabled={!ready} onClick={() => move(index, -1)} aria-label={`Move ${resource.titleOf(item)} up`}>
                          <ArrowUp className="size-4" aria-hidden="true" />
                        </button>
                        <button type="button" className={iconButton} data-move={item.id} disabled={index === data.items.length - 1} aria-disabled={!ready} onClick={() => move(index, 1)} aria-label={`Move ${resource.titleOf(item)} down`}>
                          <ArrowDown className="size-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer" className={iconButton} aria-label={`View ${resource.titleOf(item)} on the site (opens in a new tab)`}>
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                    )}
                    <Link href={`/admin/${resource.key}/${item.id}`} className={iconButton} aria-label={`Edit ${resource.titleOf(item)}`}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </Link>
                    <button type="button" className={cn(iconButton, "hover:text-tone-amber")} aria-disabled={!ready} onClick={() => remove(item)} aria-label={`Delete ${resource.titleOf(item)}`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
