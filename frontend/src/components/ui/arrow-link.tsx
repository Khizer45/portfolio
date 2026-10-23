import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/format";

/** Inline text link with an arrow, for "View all" style actions. */
export function ArrowLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const classes = cn(
    "group inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover",
    className,
  );
  const Icon = external ? ArrowUpRight : ArrowRight;
  const icon = (
    <Icon
      className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
      aria-hidden="true"
    />
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        {icon}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
      {icon}
    </Link>
  );
}
