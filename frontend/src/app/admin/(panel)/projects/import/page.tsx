"use client";

import { ArrowLeft, Download, Search, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { api, errorMessage, revalidatePublicSite } from "@/features/admin/api";
import { inputClass } from "@/features/admin/form/fields";
import { useToast } from "@/features/admin/toast";
import { AdminPageHeader, Card } from "@/features/admin/ui";
import { useApiData } from "@/features/admin/use-api";
import { cn } from "@/lib/format";
import { projectStatusMeta } from "@/lib/labels";
import type { AdminRecord, Page } from "@/types/api";

type Repo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
  already_imported: boolean;
};

/** Admin → Projects → Import from GitHub: turn public repositories into draft projects. */
export default function ImportFromGithubPage() {
  const toast = useToast();
  const { data: categories } = useApiData<Page<AdminRecord>>("/admin/project-categories?page_size=100");
  const [username, setUsername] = useState("Khizer45");
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("in_progress");
  const [busy, setBusy] = useState<"load" | "import" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: string[]; skipped: string[] } | null>(null);

  async function load(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy("load");
    setProblem(null);
    setResult(null);
    await fetchRepos();
    setBusy(null);
  }

  async function fetchRepos() {
    try {
      const list = await api.get<Repo[]>(`/admin/projects/github-repos?username=${encodeURIComponent(username)}`);
      setRepos(list);
      // Your own, active, not-yet-imported repositories are ticked to start with.
      setSelected(new Set(list.filter((r) => !r.already_imported && !r.fork && !r.archived).map((r) => r.name)));
    } catch (error) {
      setProblem(errorMessage(error));
    }
  }

  async function importSelected() {
    if (!categoryId) return setProblem("Choose a category for the imported projects.");
    setBusy("import");
    setProblem(null);
    try {
      const done = await api.post<{ created: string[]; skipped: string[] }>("/admin/projects/import-github", {
        username,
        repos: [...selected],
        category_id: categoryId,
        status,
      });
      setResult(done);
      toast.success(`Imported ${done.created.length} project${done.created.length === 1 ? "" : "s"} as drafts.`);
      revalidatePublicSite();
      await fetchRepos(); // marks the new ones as imported, keeping the result above
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  const toggle = (name: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const importable = repos?.filter((r) => !r.already_imported) ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Import from GitHub"
        description="Turn your public repositories into draft projects. Each one gets its name, description (or the first paragraph of its README), language and topics as technologies, and its GitHub and website links. Review each draft, add details, then publish."
        actions={
          <Link href="/admin/projects" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowLeft aria-hidden="true" /> All projects
          </Link>
        }
      />

      <Card className="p-5">
        <form onSubmit={load} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="github-username" className="mb-1.5 block text-sm font-medium">
              GitHub username
            </label>
            <input
              id="github-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={cn(inputClass, "h-10")}
            />
          </div>
          <button type="submit" disabled={busy !== null || !username.trim()} className={buttonClasses({ size: "md" })}>
            <Search aria-hidden="true" /> {busy === "load" ? "Loading…" : "Show repositories"}
          </button>
        </form>
        {problem && (
          <p role="alert" className="mt-3 text-sm font-medium text-tone-amber">
            {problem}
          </p>
        )}
        {result && (
          <p role="status" className="mt-3 text-sm text-fg-muted">
            Created {result.created.length} draft{result.created.length === 1 ? "" : "s"}
            {result.created.length > 0 && `: ${result.created.join(", ")}`}.
            {result.skipped.length > 0 && ` Skipped (already imported): ${result.skipped.join(", ")}.`}{" "}
            <Link href="/admin/projects?published=false" className="font-medium text-accent hover:underline">
              Review the drafts
            </Link>
          </p>
        )}
      </Card>

      {repos && (
        <section aria-labelledby="repos-heading" className="mt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="repos-heading" className="font-semibold">
              {repos.length} public repositor{repos.length === 1 ? "y" : "ies"}
            </h2>
            {importable.length > 0 && (
              <div className="flex gap-3 text-sm">
                <button type="button" className="text-accent hover:underline" onClick={() => setSelected(new Set(importable.map((r) => r.name)))}>
                  Select all
                </button>
                <button type="button" className="text-accent hover:underline" onClick={() => setSelected(new Set())}>
                  Select none
                </button>
              </div>
            )}
          </div>

          {repos.length === 0 ? (
            <Card className="p-5 text-sm text-fg-muted">This account has no public repositories.</Card>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {repos.map((repo) => (
                  <li key={repo.name} className={cn("flex gap-3 px-4 py-3", repo.already_imported && "opacity-60")}>
                    <input
                      type="checkbox"
                      id={`repo-${repo.name}`}
                      checked={selected.has(repo.name)}
                      disabled={repo.already_imported}
                      onChange={() => toggle(repo.name)}
                      className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                    />
                    <label htmlFor={`repo-${repo.name}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-fg">{repo.name}</span>
                        {repo.already_imported && <Tagline>Already imported</Tagline>}
                        {repo.fork && <Tagline>Fork</Tagline>}
                        {repo.archived && <Tagline>Archived</Tagline>}
                        {repo.stars > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
                            <Star className="size-3" aria-hidden="true" /> {repo.stars}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-fg-muted">
                        {repo.description ?? "No description on GitHub (the README's first paragraph will be used)."}
                      </span>
                      <span className="mt-1 block text-xs text-fg-subtle">
                        {[repo.language, ...repo.topics].filter(Boolean).join(" · ")}
                        {repo.pushed_at && ` · updated ${repo.pushed_at.slice(0, 10)}`}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {importable.length > 0 && (
            <Card className="mt-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="import-category" className="mb-1.5 block text-sm font-medium">
                    Category for the imported projects
                  </label>
                  <select id="import-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cn(inputClass, "h-10")}>
                    <option value="">Select…</option>
                    {categories?.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {String(c.title)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-fg-subtle">You can change each project&apos;s categories afterwards.</p>
                </div>
                <div>
                  <label htmlFor="import-status" className="mb-1.5 block text-sm font-medium">
                    Status
                  </label>
                  <select id="import-status" value={status} onChange={(e) => setStatus(e.target.value)} className={cn(inputClass, "h-10")}>
                    {Object.entries(projectStatusMeta).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fg-muted">
                  {selected.size} selected. They are saved as drafts: nothing appears on the site until you publish.
                </p>
                <button type="button" onClick={importSelected} disabled={busy !== null || selected.size === 0} className={buttonClasses({ size: "md" })}>
                  <Download aria-hidden="true" /> {busy === "import" ? "Importing…" : `Import ${selected.size} as drafts`}
                </button>
              </div>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

function Tagline({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-line px-1.5 py-px text-[0.6875rem] text-fg-subtle">{children}</span>;
}
