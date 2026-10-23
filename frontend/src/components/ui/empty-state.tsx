import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/format";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 grid size-11 place-items-center rounded-xl border border-line bg-surface text-fg-subtle">
          <Icon className="size-5" aria-hidden="true" strokeWidth={1.75} />
        </span>
      )}
      <p className="text-base font-semibold text-fg">{title}</p>
      {description && <div className="mt-2 max-w-md text-sm leading-relaxed text-pretty text-fg-muted">{description}</div>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
