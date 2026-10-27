import { GraduationCap } from "lucide-react";

import { formatRange } from "@/lib/format";
import type { Education } from "@/types/api";

export function EducationList({ items }: { items: Education[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li
          key={item.id}
          className={
            item.is_primary
              ? "card rounded-2xl p-5 sm:p-6"
              : "rounded-xl border border-line px-5 py-4 sm:px-6"
          }
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <h3 className="flex items-center gap-2 font-semibold text-fg">
              {item.is_primary && <GraduationCap className="size-4 text-accent" aria-hidden="true" />}
              {item.qualification}
            </h3>
            <p className="shrink-0 font-mono text-xs text-fg-subtle">{formatRange(item.start_date, item.end_date ?? undefined)}</p>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {item.institution}
            {item.location && ` · ${item.location}`}
          </p>
          {item.grade && <p className="mt-2 text-sm font-medium text-fg">{item.grade}</p>}
          {item.highlights && item.highlights.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
              {item.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          )}
          {item.coursework && item.coursework.length > 0 && (
            <p className="mt-3 text-sm text-fg-subtle">
              <span className="text-fg-muted">Relevant coursework:</span> {item.coursework.join(", ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
