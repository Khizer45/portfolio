const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2025-07" → "Jul 2025", "2019" → "2019". Parsed manually to avoid timezone shifts. */
export function formatMonth(value: string, style: "short" | "long" = "short"): string {
  const [year, month] = value.split("-");
  if (!month) return year;
  const names = style === "long" ? MONTHS_LONG : MONTHS;
  return `${names[Number(month) - 1]} ${year}`;
}

/** "2026-10-20" → "20 Oct 2026". */
export function formatDay(value: string): string {
  const [year, month, day] = value.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatRange(start?: string, end?: string, ongoingLabel = "Present"): string | null {
  if (!start && !end) return null;
  if (!start) return formatMonth(end!);
  return `${formatMonth(start)} – ${end ? formatMonth(end) : ongoingLabel}`;
}

/** Inclusive month count between two "YYYY-MM" values, e.g. Jul–Oct → "4 months". */
export function formatDuration(start: string, end?: string): string | null {
  if (!end) return null;
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  if (!sm || !em) return null;
  const months = (ey - sy) * 12 + (em - sm) + 1;
  if (months < 1) return null;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rest) parts.push(`${rest} ${rest === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "https://www.linkedin.com/in/name/" → "linkedin.com/in/name". */
export function displayUrl(url: string): string {
  try {
    const { hostname: host, pathname } = new URL(url);
    return `${host.replace(/^www\./, "")}${pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}
