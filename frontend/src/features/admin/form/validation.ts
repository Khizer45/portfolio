import type { FieldDef, FieldErrors, FormSection, FormValues } from "@/features/admin/form/types";

const PARTIAL_DATE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same rule as the backend: "%" only as a "%XX" escape, and no ".." segment, backslash or
// control character once decoded (the site decodes these paths to find the file).
const SAFE_PATH = /^\/(?!\/)(?:[A-Za-z0-9._~\-/()+]|%[0-9A-Fa-f]{2})*$/;

export function isAbsoluteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.host);
  } catch {
    return false;
  }
}

function isSafePath(value: string): boolean {
  if (!SAFE_PATH.test(value)) return false;
  try {
    const decoded = decodeURIComponent(value);
    return !decoded.split("/").includes("..") && !/[\\\u0000-\u001f\u007f]/.test(decoded);
  } catch {
    return false;
  }
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

/** Client-side checks for quick feedback. The backend validates everything again. */
function validateField(field: FieldDef, value: unknown, key: string, errors: FieldErrors) {
  if (field.required && isEmpty(value) && field.type !== "checkbox") {
    errors[key] = `${field.label} is required.`;
    return;
  }
  if (isEmpty(value)) return;
  const text = typeof value === "string" ? value.trim() : "";

  switch (field.type) {
    case "text":
    case "textarea":
      if (field.maxLength && text.length > field.maxLength) errors[key] = `Use at most ${field.maxLength} characters.`;
      break;
    case "email":
      if (!EMAIL.test(text)) errors[key] = "Enter a valid email address.";
      break;
    case "url":
      if (!isAbsoluteUrl(text)) errors[key] = "Enter a full URL starting with https://";
      break;
    case "link":
      if (text.startsWith("/") ? !isSafePath(text) : !isAbsoluteUrl(text)) {
        errors[key] = "Enter a full URL (https://…) or a site path starting with / (e.g. /cv/my-cv.pdf).";
      }
      break;
    case "partial-date":
      if (!PARTIAL_DATE.test(text)) errors[key] = "Use YYYY or YYYY-MM, e.g. 2025-07.";
      break;
    case "tags":
    case "lines": {
      // The backend's limits for one tag / one line.
      const max = field.type === "tags" ? 60 : 1000;
      const index = (value as string[]).findIndex((item) => item.length > max);
      if (index >= 0) errors[key] = `${field.type === "tags" ? "Tag" : "Line"} ${index + 1} is longer than ${max} characters.`;
      break;
    }
    case "number": {
      const number = Number(value);
      if (!Number.isFinite(number)) errors[key] = "Enter a number.";
      else if (field.min !== undefined && number < field.min) errors[key] = `Must be at least ${field.min}.`;
      else if (field.max !== undefined && number > field.max) errors[key] = `Must be at most ${field.max}.`;
      break;
    }
    case "repeater":
      (value as FormValues[]).forEach((item, index) => {
        for (const sub of field.fields) validateField(sub, item[sub.name], `${key}.${index}.${sub.name}`, errors);
      });
      break;
  }
}

export function validate(sections: FormSection[], values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const section of sections) {
    for (const field of section.fields) validateField(field, values[field.name], field.name, errors);
  }
  return errors;
}

function convert(field: FieldDef, value: unknown): unknown {
  switch (field.type) {
    case "relation":
      return value ? value : null;
    case "select":
      return value === "" ? null : value;
    case "number":
      // An empty optional number is left out of the JSON body, so the backend default applies.
      return value === "" || value === null || value === undefined ? (field.required ? 0 : undefined) : Number(value);
    case "repeater":
      return ((value as FormValues[]) ?? []).map((item) =>
        Object.fromEntries(field.fields.map((sub) => [sub.name, convert(sub, item[sub.name])])),
      );
    default:
      return value;
  }
}

/** Turn form values into the JSON body the API expects. */
export function toPayload(sections: FormSection[], values: FormValues): FormValues {
  const payload: FormValues = {};
  for (const section of sections) {
    for (const field of section.fields) payload[field.name] = convert(field, values[field.name]);
  }
  return payload;
}

/** Turn an API record into form values (null → "" for inputs, [] for lists). */
export function toFormValues(sections: FormSection[], record: FormValues): FormValues {
  const values: FormValues = {};
  const fromApi = (field: FieldDef, value: unknown): unknown => {
    switch (field.type) {
      case "checkbox":
        return Boolean(value);
      case "tags":
      case "lines":
      case "multi-relation":
        return Array.isArray(value) ? value : [];
      case "repeater":
        return Array.isArray(value)
          ? value.map((item: FormValues) =>
              Object.fromEntries(field.fields.map((sub) => [sub.name, fromApi(sub, item[sub.name])])),
            )
          : [];
      case "number":
        return value === null || value === undefined ? "" : value;
      default:
        return value === null || value === undefined ? "" : value;
    }
  };
  for (const section of sections) {
    for (const field of section.fields) {
      const value = record[field.name] === undefined ? field.defaultValue : record[field.name];
      values[field.name] = fromApi(field, value);
    }
  }
  return values;
}

/** Empty item for a repeater row. */
export function emptyItem(fields: FieldDef[]): FormValues {
  return toFormValues([{ title: "", fields }], {});
}
