"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { ApiError, api, onUnauthorized } from "@/features/admin/api";
import { useConfirm } from "@/features/admin/confirm";
import { Field, fieldDomId } from "@/features/admin/form/fields";
import type { FieldDef, FieldErrors, FormSection, FormValues, Option, OptionSource } from "@/features/admin/form/types";
import { toPayload, validate } from "@/features/admin/form/validation";
import type { Page } from "@/types/api";

const SOURCES: Record<OptionSource, { path: string; label: (item: Record<string, unknown>) => string }> = {
  "project-categories": { path: "/admin/project-categories?page_size=100", label: (i) => String(i.title) },
  "skill-categories": { path: "/admin/skill-categories?page_size=100", label: (i) => String(i.title) },
  projects: {
    path: "/admin/projects?page_size=100",
    label: (i) => `${i.title}${i.is_published ? "" : " (draft)"}`,
  },
};

/** Load the option lists that relation fields in these sections need. */
export function useOptionSources(sections: FormSection[]) {
  const needed = useMemo(() => {
    const set = new Set<OptionSource>();
    const walk = (fields: FormSection["fields"]) =>
      fields.forEach((f) => {
        if (f.type === "relation" || f.type === "multi-relation") set.add(f.source);
        if (f.type === "repeater") walk(f.fields);
      });
    sections.forEach((s) => walk(s.fields));
    return [...set].sort();
  }, [sections]);

  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState<string | null>(null);
  const key = needed.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    Promise.all(
      key.split(",").map(async (source) => {
        const def = SOURCES[source as OptionSource];
        const page = await api.get<Page<Record<string, unknown>>>(def.path);
        return [source, page.items.map((item) => ({ value: String(item.id), label: def.label(item) }))] as const;
      }),
    )
      .then((entries) => !cancelled && setOptions(Object.fromEntries(entries)))
      .catch(() => !cancelled && setError("Some options could not be loaded. Reload the page to try again."));
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { options, error };
}

/**
 * Map an error key from the API ("end_date", "features.0.name", "technologies.3") to the
 * field that shows it. An error on one list item goes to the list, keeping the item
 * number for the message. Null if the key matches no field.
 */
function placeError(fields: FieldDef[], [name, index, ...rest]: string[], prefix = ""): { path: string; item?: string } | null {
  const field = fields.find((f) => f.name === name);
  if (!field) return null;
  const path = `${prefix}${name}`;
  if (index === undefined || !/^\d+$/.test(index)) return { path };
  if (field.type === "repeater" && rest.length) {
    const nested = placeError(field.fields, rest, `${path}.${index}.`);
    if (nested) return nested;
  }
  const noun = field.type === "repeater" ? field.itemLabel : field.type === "tags" ? "Tag" : field.type === "lines" ? "Line" : "Item";
  return { path, item: `${noun} ${Number(index) + 1}` };
}

/** Split a failed save into messages on fields and messages for the whole form. */
function serverErrors(sections: FormSection[], error: unknown) {
  const fields: FieldErrors = {};
  const general: string[] = [];
  if (!(error instanceof ApiError)) return { fields, general };
  general.push(...error.formErrors);
  const all = sections.flatMap((s) => s.fields);
  for (const [key, message] of Object.entries(error.fieldErrors)) {
    const placed = placeError(all, key.split("."));
    if (!placed) general.push(message);
    else fields[placed.path] ??= placed.item ? `${placed.item}: ${message}` : message;
  }
  return { fields, general };
}

/* Unsaved edits are kept in this tab's sessionStorage when the page goes away without
   asking first (Back/Forward, or the session ending), and offered again on return. */

function readDraft(key: string): FormValues | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as FormValues) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: FormValues | null) {
  try {
    if (draft && Object.keys(draft).length) sessionStorage.setItem(key, JSON.stringify(draft));
    else sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (blocked, full); the draft is only a convenience.
  }
}

/** The values worth keeping: never passwords. */
const draftOf = (sections: FormSection[], values: FormValues): FormValues =>
  Object.fromEntries(
    sections.flatMap((s) => s.fields).filter((f) => f.type !== "password").map((f) => [f.name, values[f.name]]),
  );

export function ResourceForm({
  sections,
  initialValues,
  onSubmit,
  submitLabel,
  secondaryActions,
  isNew = false,
}: {
  sections: FormSection[];
  initialValues: FormValues;
  /** Receives the API payload. Throw an ApiError to show field errors. */
  onSubmit: (payload: FormValues) => Promise<void>;
  submitLabel: string;
  secondaryActions?: React.ReactNode;
  /** The record does not exist yet (a create form). */
  isNew?: boolean;
}) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessages, setFormMessages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const { options, error: optionsError } = useOptionSources(sections);
  const router = useRouter();
  const confirm = useConfirm();
  const draftKey = `admin-draft:${usePathname()}`;
  const [draft, setDraft] = useState(() => readDraft(draftKey));
  // Bumped when a draft is restored, so inputs that keep their own text start over.
  const [restored, setRestored] = useState(0);

  // Keep focused fields clear of the sticky action bar at the bottom.
  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollPaddingBottom = "5rem";
    return () => {
      root.style.scrollPaddingBottom = "";
    };
  }, []);

  // Guard unsaved changes. Closing or reloading the tab asks via beforeunload. Links in
  // the app navigate without unloading the page, so ask before following them.
  // Back/Forward and an ended session can't be stopped: keep a draft instead.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const keep = () => writeDraft(draftKey, draftOf(sections, values));
    const intercept = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      // Other sites are covered by beforeunload; #links within this page are harmless.
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      void confirm({
        title: "Leave without saving?",
        message: "Your unsaved changes on this page will be lost.",
        confirmLabel: "Leave page",
        destructive: true,
      }).then((leave) => {
        if (!leave) return;
        window.removeEventListener("beforeunload", warn);
        writeDraft(draftKey, null);
        router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("popstate", keep);
    // The capture phase on document runs before React (and next/link) see the click.
    document.addEventListener("click", intercept, true);
    const unsubscribe = onUnauthorized(keep);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("popstate", keep);
      document.removeEventListener("click", intercept, true);
      unsubscribe();
    };
  }, [dirty, values, sections, draftKey, confirm, router]);

  function discardDraft() {
    writeDraft(draftKey, null);
    setDraft(null);
  }

  function restoreDraft() {
    setValues((current) => ({ ...current, ...draft }));
    setDirty(true);
    setRestored((n) => n + 1);
    discardDraft();
  }

  const setValue = (name: string, value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    setDirty(true);
    // Clear errors for this field (and its nested rows) as the user fixes them.
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) if (key === name || key.startsWith(`${name}.`)) delete next[key];
      return next;
    });
  };

  const focusFirstError = (found: FieldErrors) => {
    requestAnimationFrame(() => {
      summaryRef.current?.focus();
      const first = Object.keys(found)[0];
      if (first) document.getElementById(fieldDomId(first))?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormMessages([]);
    const found = validate(sections, values);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }
    setSubmitting(true);
    // These values supersede any kept draft (if the session has ended, they are kept again).
    discardDraft();
    try {
      await onSubmit(toPayload(sections, values));
      setDirty(false);
    } catch (error) {
      const { fields, general } = serverErrors(sections, error);
      setErrors(fields);
      if (Object.keys(fields).length) {
        if (error instanceof ApiError && error.status === 409) setFormError("This conflicts with an existing record.");
        setFormMessages(general);
        focusFirstError(fields);
      } else {
        // Nothing to highlight: show the messages on their own.
        setFormError(general.join(" ") || (error instanceof ApiError ? error.message : "Saving failed. Please try again."));
        requestAnimationFrame(() => summaryRef.current?.focus());
      }
    } finally {
      setSubmitting(false);
    }
  }

  const errorEntries = Object.entries(errors);
  const headline = formError ?? optionsError ?? (errorEntries.length > 0 ? "Please fix the highlighted fields." : null);
  const labelFor = (key: string) => {
    const [name, index, sub] = key.split(".");
    for (const section of sections) {
      const field = section.fields.find((f) => f.name === name);
      if (!field) continue;
      if (field.type === "repeater" && index !== undefined) {
        const subField = field.fields.find((f) => f.name === sub);
        return `${field.itemLabel} ${Number(index) + 1}: ${subField?.label ?? sub}`;
      }
      return field.label;
    }
    return key;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {draft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-line bg-accent-soft p-4 text-sm">
          <p className="text-fg">You have unsaved changes from your last visit to this page.</p>
          <div className="flex gap-2">
            <button type="button" onClick={restoreDraft} className={buttonClasses({ size: "sm" })}>
              Restore changes
            </button>
            <button type="button" onClick={discardDraft} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Discard
            </button>
          </div>
        </div>
      )}

      {(headline || formMessages.length > 0) && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-tone-amber/40 bg-tone-amber/[0.06] p-4 text-sm focus:outline-none">
          {headline && <p className="font-medium text-fg">{headline}</p>}
          {(errorEntries.length > 0 || formMessages.length > 0) && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-muted first:mt-0">
              {errorEntries.map(([key, message]) => (
                <li key={key}>
                  <a href={`#${fieldDomId(key)}`} className="underline underline-offset-2 hover:text-fg">
                    {labelFor(key)}
                  </a>
                  : {message}
                </li>
              ))}
              {/* Errors that belong to no single field: plain text, nothing to link to. */}
              {formMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sections.map((section) => (
        <section key={`${section.title}-${restored}`} aria-labelledby={`section-${fieldDomId(section.title)}`} className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 id={`section-${fieldDomId(section.title)}`} className="font-semibold">
            {section.title}
          </h2>
          {section.description && <p className="mt-1 text-sm text-fg-muted">{section.description}</p>}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {section.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                path={field.name}
                value={values[field.name]}
                onChange={(value) => setValue(field.name, value)}
                errors={errors}
                options={options}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-xs text-fg-subtle" aria-live="polite">
          {dirty ? "Unsaved changes" : isNew ? "Not saved yet" : "All changes saved"}
        </p>
        <div className="flex flex-wrap gap-2">
          {secondaryActions}
          <button type="submit" disabled={submitting} className={buttonClasses({ size: "sm" })}>
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {submitting ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
