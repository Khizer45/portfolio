export type Option = { value: string; label: string };

/** Lists of options loaded from the API (see useOptionSources). */
export type OptionSource = "project-categories" | "skill-categories" | "projects";

type Base = {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  placeholder?: string;
  /** Span both columns of the form grid. */
  wide?: boolean;
  /** Initial value for new records and new repeater rows. */
  defaultValue?: unknown;
};

export type FieldDef =
  | (Base & { type: "text" | "email"; maxLength?: number })
  | (Base & { type: "password"; autoComplete: "current-password" | "new-password" })
  /** Absolute http(s) URL. */
  | (Base & { type: "url" })
  /** Absolute URL, or a path to a file in the frontend's public/ folder ("/cv/file.pdf"). */
  | (Base & { type: "link" })
  /** Optional "#rrggbb" colour, picked or typed. Empty means "not set". */
  | (Base & { type: "color" })
  | (Base & { type: "textarea"; maxLength?: number; rows?: number; markdown?: boolean })
  | (Base & { type: "number"; min?: number; max?: number })
  | (Base & { type: "checkbox" })
  | (Base & { type: "select"; options: Option[]; allowEmpty?: string })
  | (Base & { type: "relation"; source: OptionSource; allowEmpty?: string })
  | (Base & { type: "multi-relation"; source: OptionSource })
  | (Base & { type: "tags"; maxItems?: number })
  | (Base & { type: "lines"; rows?: number })
  /** "YYYY" or "YYYY-MM". */
  | (Base & { type: "partial-date" })
  | (Base & {
      type: "repeater";
      fields: FieldDef[];
      itemLabel: string;
      maxItems?: number;
      /** Sub-field shown in the collapsed row heading. */
      titleField?: string;
    });

export type FormSection = { title: string; description?: string; fields: FieldDef[] };

export type FormValues = Record<string, unknown>;
export type FieldErrors = Record<string, string>;
