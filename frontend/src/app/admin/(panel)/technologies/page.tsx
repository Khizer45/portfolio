"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";

import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError, api, errorMessage, revalidatePublicSite } from "@/features/admin/api";
import { useConfirm } from "@/features/admin/confirm";
import { inputClass } from "@/features/admin/form/fields";
import { useToast } from "@/features/admin/toast";
import { useApiData } from "@/features/admin/use-api";
import { AdminPageHeader, ErrorState, Skeleton } from "@/features/admin/ui";
import { cn } from "@/lib/format";

type Technology = { id: string; name: string; slug: string; project_count: number };

export default function TechnologiesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: items, error, reload } = useApiData<Technology[]>("/admin/technologies");
  const [editing, setEditing] = useState<{ id: string; name: string; error?: string } | null>(null);

  // Closing the inline form unmounts the focused input, so put focus back on the row's Rename button.
  function stopEditing(id: string) {
    flushSync(() => setEditing(null));
    document.getElementById(`rename-${id}`)?.focus();
  }

  async function rename(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) return setEditing({ ...editing, error: "Enter a name." });
    try {
      await api.put(`/admin/technologies/${editing.id}`, { name: editing.name.trim() });
      toast.success("Technology renamed everywhere it is used.");
      stopEditing(editing.id);
      revalidatePublicSite();
      reload();
    } catch (e) {
      setEditing({ ...editing, error: e instanceof ApiError ? (e.fieldErrors.name ?? e.message) : errorMessage(e) });
    }
  }

  async function remove(tech: Technology) {
    const ok = await confirm({
      title: "Delete technology?",
      message:
        tech.project_count > 0
          ? `"${tech.name}" will be removed from ${tech.project_count} project${tech.project_count === 1 ? "" : "s"}.`
          : `"${tech.name}" is not used by any project.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/technologies/${tech.id}`);
      toast.success(`Deleted ${tech.name}.`);
      revalidatePublicSite();
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function removeUnused() {
    const ok = await confirm({ title: "Remove unused technologies?", message: "Technologies not used by any project will be deleted.", confirmLabel: "Remove" });
    if (!ok) return;
    try {
      await api.delete("/admin/technologies/unused");
      toast.success("Unused technologies removed.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const unused = items?.filter((t) => t.project_count === 0).length ?? 0;

  return (
    <div>
      <AdminPageHeader
        title="Technologies"
        description="Created automatically when you add them to a project. Rename here to fix spelling everywhere at once."
        actions={
          unused > 0 ? (
            <button type="button" onClick={removeUnused} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Remove {unused} unused
            </button>
          ) : undefined
        }
      />
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : items === null ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <EmptyState title="No technologies yet" description="Add technologies to a project and they will appear here." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {items.map((tech) => (
            <li key={tech.id} className="flex items-center gap-3 px-4 py-3">
              {editing?.id === tech.id ? (
                <form onSubmit={rename} className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`tech-${tech.id}`} className="sr-only">
                      New name for {tech.name}
                    </label>
                    <input
                      id={`tech-${tech.id}`}
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value, error: undefined })}
                      onKeyDown={(e) => e.key === "Escape" && stopEditing(tech.id)}
                      aria-invalid={editing.error ? true : undefined}
                      aria-describedby={editing.error ? `tech-${tech.id}-error` : undefined}
                      className={cn(inputClass, "h-9 max-w-xs")}
                      autoFocus
                    />
                    <button type="submit" className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg" aria-label="Save name">
                      <Check className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => stopEditing(tech.id)} className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg" aria-label="Cancel renaming">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {editing.error && (
                    <p id={`tech-${tech.id}-error`} role="alert" className="text-xs font-medium text-tone-amber">
                      {editing.error}
                    </p>
                  )}
                </form>
              ) : (
                <>
                  <span className="flex-1 font-mono text-sm">{tech.name}</span>
                  <span className="text-xs text-fg-subtle">
                    {tech.project_count} project{tech.project_count === 1 ? "" : "s"}
                  </span>
                  <button id={`rename-${tech.id}`} type="button" onClick={() => setEditing({ id: tech.id, name: tech.name })} className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg" aria-label={`Rename ${tech.name}`}>
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => remove(tech)} className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-tone-amber" aria-label={`Delete ${tech.name}`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
