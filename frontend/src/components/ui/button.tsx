import Link from "next/link";

import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const base =
  "group/button inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-150";

const variants: Record<Variant, string> = {
  // The border and shadow come from the theme's card style (see btn-press in globals.css).
  primary: "btn-press border border-[var(--btn-border)] bg-accent-fill text-accent-fill-fg hover:bg-accent-fill-hover",
  secondary: "btn-press border border-[var(--btn-border-secondary)] bg-surface text-fg hover:bg-surface-muted",
  ghost: "text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
};

export function buttonClasses({ variant = "primary", size = "md", className }: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  /** Opens in a new tab with safe rel attributes. */
  external?: boolean;
  /** Suggests a file name and downloads instead of navigating. */
  download?: string | boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "download">;

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  external,
  download,
  ...rest
}: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, className });
  if (external || download || /^(https?:|mailto:)/.test(href)) {
    return (
      <a
        href={href}
        className={classes}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...(download ? { download: download === true ? "" : download } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
