import Link from "next/link";

import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const base =
  "group/button inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-150";

const variants: Record<Variant, string> = {
  primary: "bg-accent-fill text-accent-fill-fg hover:bg-accent-fill-hover",
  secondary: "border border-line-strong bg-transparent text-fg hover:border-fg-subtle hover:bg-surface-muted",
  ghost: "text-fg-muted hover:bg-surface-muted hover:text-fg",
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
