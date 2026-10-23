"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { FieldDef, FieldErrors, FormValues, Option } from "@/features/admin/form/types";
import { emptyItem } from "@/features/admin/form/validation";
import { cn } from "@/lib/format";

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle hover:border-fg-subtle focus-visible:border-accent aria-[invalid=true]:border-tone-amber";

export function fieldDomId(key: string) {
  return `field-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

type FieldProps = {
  field: FieldDef;
  /** Error key / DOM id path, e.g. "features.0.name". */
  path: string;
  value: unknown;
  onChange: (value: unknown) => void;
  errors: FieldErrors;
  options: Record<string, Option[]>;
};

function Label({ htmlFor, field, as = "label" }: { htmlFor?: string; field: FieldDef; as?: "label" | "legend" }) {
  const Tag = as;
  return (
    <Tag {...(as === "label" ? { htmlFor } : {})} className="mb-1.5 block text-sm font-medium text-fg">
      {field.label}
      {field.required && (
        <span className="text-tone-amber" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </Tag>
  );
}

function Hint({ id, help, error }: { id: string; help?: string; error?: string }) {
  return (
    <>
      {help && (
        <p id={`${id}-help`} className="mt-1.5 text-xs leading-relaxed text-fg-subtle">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-tone-amber">
          {error}
        </p>
      )}
    </>
  );
}

function describedBy(id: string, field: FieldDef, error?: string) {
  return [field.help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

export function Field(props: FieldProps) {
  const { field, path, value, onChange, errors, options } = props;
  const id = fieldDomId(path);
  const error = errors[path];
  const common = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(id, field, error),
    "aria-required": field.required || undefined,
  } as const;
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";

  switch (field.type) {
    case "checkbox":
      return (
        <div className={cn(field.wide && "sm:col-span-2")}>
          <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
            <input
              {...common}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="mt-0.5 size-4 rounded border-line-strong accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-medium text-fg">{field.label}</span>
              {field.help && (
                <span id={`${id}-help`} className="mt-0.5 block text-xs text-fg-subtle">
                  {field.help}
                </span>
              )}
            </span>
          </label>
          {error && (
            <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-tone-amber">
              {error}
            </p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div className={cn("sm:col-span-2")}>
          <Label htmlFor={id} field={field} />
          {field.markdown ? (
            <MarkdownInput common={common} value={text} onChange={onChange} rows={field.rows ?? 12} placeholder={field.placeholder} />
          ) : (
            <textarea
              {...common}
              rows={field.rows ?? 4}
              value={text}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
              className={cn(inputClass, "py-2 leading-relaxed")}
            />
          )}
          <div className="flex justify-between gap-4">
            <Hint id={id} help={field.help} error={error} />
            {field.maxLength && (
              <p className={cn("mt-1.5 shrink-0 text-xs", text.length > field.maxLength ? "text-tone-amber" : "text-fg-subtle")}>
                {text.length}/{field.maxLength}
              </p>
            )}
          </div>
        </div>
      );

    case "select":
    case "relation": {
      const list = field.type === "select" ? field.options : (options[field.source] ?? []);
      return (
        <div className={cn(field.wide && "sm:col-span-2")}>
          <Label htmlFor={id} field={field} />
          <select {...common} value={text} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "h-10")}>
            {(field.allowEmpty !== undefined || !text) && <option value="">{field.allowEmpty ?? "Select…"}</option>}
            {list.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Hint id={id} help={field.help} error={error} />
        </div>
      );
    }

    case "multi-relation": {
      const selected = new Set((value as string[]) ?? []);
      const list = options[field.source] ?? [];
      // id and tabIndex let the error summary link move focus here (same for Repeater).
      return (
        <fieldset id={id} tabIndex={-1} className="min-w-0 sm:col-span-2" aria-describedby={describedBy(id, field, error)}>
          <Label as="legend" field={field} />
          <div className="grid gap-2 rounded-lg border border-line-strong p-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.length === 0 && <p className="text-sm text-fg-subtle">Nothing to choose from yet.</p>}
            {list.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(option.value)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(option.value);
                    else next.delete(option.value);
                    onChange([...next]);
                  }}
                  className="size-4 accent-[var(--accent)]"
                />
                {option.label}
              </label>
            ))}
          </div>
          <Hint id={id} help={field.help} error={error} />
        </fieldset>
      );
    }

    case "tags":
      return (
        <div className="sm:col-span-2">
          <Label htmlFor={id} field={field} />
          <TagsInput common={common} value={(value as string[]) ?? []} onChange={onChange} placeholder={field.placeholder} maxItems={field.maxItems} />
          <Hint id={id} help={field.help ?? "Press Enter or comma to add. Backspace removes the last one."} error={error} />
        </div>
      );

    case "lines":
      return (
        <div className="sm:col-span-2">
          <Label htmlFor={id} field={field} />
          <LinesInput common={common} value={(value as string[]) ?? []} onChange={onChange} rows={field.rows ?? 4} placeholder={field.placeholder} />
          <Hint id={id} help={field.help ?? "One item per line."} error={error} />
        </div>
      );

    case "repeater":
      return <Repeater {...props} field={field} />;

    default: {
      const type =
        field.type === "number"
          ? "number"
          : field.type === "email"
            ? "email"
            : field.type === "password"
              ? "password"
              : field.type === "url" || field.type === "link"
                ? "url"
                : "text";
      return (
        <div className={cn(field.wide && "sm:col-span-2")}>
          <Label htmlFor={id} field={field} />
          <input
            {...common}
            type={field.type === "link" ? "text" : type}
            inputMode={field.type === "link" || field.type === "url" ? "url" : field.type === "partial-date" ? "numeric" : undefined}
            value={text}
            placeholder={field.placeholder ?? (field.type === "partial-date" ? "YYYY-MM" : undefined)}
            onChange={(e) => onChange(e.target.value)}
            min={field.type === "number" ? field.min : undefined}
            max={field.type === "number" ? field.max : undefined}
            maxLength={field.type === "text" ? field.maxLength : undefined}
            autoComplete={field.type === "password" ? field.autoComplete : "off"}
            spellCheck={field.type === "text"}
            className={cn(inputClass, "h-10")}
          />
          <Hint id={id} help={field.help} error={error} />
        </div>
      );
    }
  }
}

type Common = Record<string, unknown>;

function TagsInput({
  common,
  value,
  onChange,
  placeholder,
  maxItems,
}: {
  common: Common;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...value];
    for (const item of items) {
      if (!next.some((existing) => existing.toLowerCase() === item.toLowerCase())) next.push(item);
    }
    onChange(maxItems ? next.slice(0, maxItems) : next);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line-strong bg-surface p-1.5 focus-within:border-accent">
      {value.map((tag, index) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-muted py-0.5 pr-1 pl-2 font-mono text-xs text-fg">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="rounded p-0.5 text-fg-subtle hover:text-fg"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        {...common}
        value={draft}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft.trim()) add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        className="h-7 min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
      />
    </div>
  );
}

function LinesInput({
  common,
  value,
  onChange,
  rows,
  placeholder,
}: {
  common: Common;
  value: string[];
  onChange: (value: string[]) => void;
  rows: number;
  placeholder?: string;
}) {
  // Keep the raw text locally so typing a new (still empty) line isn't lost.
  const [text, setText] = useState(value.join("\n"));
  return (
    <textarea
      {...common}
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split("\n").map((line) => line.trim()).filter(Boolean));
      }}
      className={cn(inputClass, "py-2 leading-relaxed")}
    />
  );
}

function MarkdownInput({
  common,
  value,
  onChange,
  rows,
  placeholder,
}: {
  common: Common;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
}) {
  const [preview, setPreview] = useState(false);
  // Switch back to Write when the field gets an error, so the error summary can focus it.
  const invalid = Boolean(common["aria-invalid"]);
  const [wasInvalid, setWasInvalid] = useState(invalid);
  if (invalid !== wasInvalid) {
    setWasInvalid(invalid);
    if (invalid) setPreview(false);
  }
  const tabs = useId();
  const tab = (active: boolean) =>
    cn("rounded-md px-2.5 py-1 text-xs font-medium", active ? "bg-surface-muted text-fg" : "text-fg-muted hover:text-fg");
  return (
    <div className="overflow-hidden rounded-lg border border-line-strong has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-accent">
      <div role="tablist" aria-label="Editor mode" className="flex gap-1 border-b border-line bg-surface p-1">
        <button type="button" role="tab" id={`${tabs}-write`} aria-selected={!preview} className={tab(!preview)} onClick={() => setPreview(false)}>
          Write
        </button>
        <button type="button" role="tab" id={`${tabs}-preview`} aria-selected={preview} className={tab(preview)} onClick={() => setPreview(true)}>
          Preview
        </button>
        <span className="ml-auto self-center pr-2 text-xs text-fg-subtle">Markdown</span>
      </div>
      {preview ? (
        <div role="tabpanel" aria-labelledby={`${tabs}-preview`} className="prose-article min-h-40 bg-surface p-4 text-[0.9375rem]">
          {value.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown> : <p>Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea
          {...common}
          rows={rows}
          value={value}
          placeholder={placeholder ?? "## Heading\n\nWrite in Markdown…"}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full resize-y bg-surface px-3 py-2 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-fg-subtle"
        />
      )}
    </div>
  );
}

function Repeater({ field, path, value, onChange, errors, options }: FieldProps & { field: Extract<FieldDef, { type: "repeater" }> }) {
  const items = (value as FormValues[]) ?? [];
  const id = fieldDomId(path);
  const update = (index: number, next: FormValues) => onChange(items.map((item, i) => (i === index ? next : item)));
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const atLimit = field.maxItems !== undefined && items.length >= field.maxItems;
  const iconButton = "grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg disabled:opacity-30";

  return (
    <fieldset id={id} tabIndex={-1} className="min-w-0 sm:col-span-2" aria-describedby={describedBy(id, field, errors[path])}>
      <Label as="legend" field={field} />
      {field.help && (
        <p id={`${id}-help`} className="-mt-0.5 mb-2 text-xs text-fg-subtle">
          {field.help}
        </p>
      )}
      <ol className="space-y-3">
        {items.map((item, index) => {
          const title = field.titleField ? String(item[field.titleField] ?? "") : "";
          return (
            <li key={index} className="rounded-lg border border-line bg-surface-muted/40 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-xs font-medium tracking-wide text-fg-subtle uppercase">
                  {field.itemLabel} {index + 1}
                  {title && <span className="normal-case"> · {title}</span>}
                </p>
                <div className="flex shrink-0">
                  <button type="button" className={iconButton} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${field.itemLabel} ${index + 1} up`}>
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={iconButton} disabled={index === items.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${field.itemLabel} ${index + 1} down`}>
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={cn(iconButton, "hover:text-tone-amber")} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={`Remove ${field.itemLabel} ${index + 1}`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {field.fields.map((sub) => (
                  <Field
                    key={sub.name}
                    field={sub}
                    path={`${path}.${index}.${sub.name}`}
                    value={item[sub.name]}
                    onChange={(v) => update(index, { ...item, [sub.name]: v })}
                    errors={errors}
                    options={options}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={atLimit}
        onClick={() => onChange([...items, emptyItem(field.fields)])}
        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-sm font-medium text-fg-muted hover:border-fg-subtle hover:text-fg disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" /> Add {field.itemLabel.toLowerCase()}
      </button>
      {errors[path] && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-tone-amber">
          {errors[path]}
        </p>
      )}
    </fieldset>
  );
}
