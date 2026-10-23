import Link from "next/link";

import { CategoryIcon } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import type { Category } from "@/types/api";

export function CategoryCard({ category }: { category: Category }) {
  const empty = category.project_count === 0;
  return (
    <Link
      href={`/projects/category/${category.slug}`}
      className={cn(
        "group flex h-full items-start gap-4 rounded-xl border p-4 transition-colors",
        empty
          ? "border-dashed border-line-strong hover:border-fg-subtle"
          : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg border",
          empty ? "border-line text-fg-subtle" : "border-accent-line bg-accent-soft text-accent",
        )}
      >
        <CategoryIcon name={category.icon} className="size-[1.125rem]" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-fg">{category.title}</span>
        <span className="mt-0.5 block text-sm text-fg-subtle">
          {empty
            ? "Projects coming soon"
            : `${category.project_count} ${category.project_count === 1 ? "project" : "projects"}`}
        </span>
      </span>
    </Link>
  );
}
