import { CategoryIcon } from "@/components/ui/icons";
import { cn } from "@/lib/format";
import { DEFAULT_IMAGE_SIZE } from "@/lib/project-utils";
import type { CategoryIcon as CategoryIconName, ProjectImage } from "@/types/api";

export function ImagePlaceholder({
  icon,
  label = "Screenshot coming soon",
  decorative = false,
  className,
}: {
  icon: CategoryIconName;
  label?: string;
  /** Hide from assistive tech when the surrounding content already describes the project. */
  decorative?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden bg-surface-muted",
        className,
      )}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    >
      <div className="bg-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <span className="relative grid size-11 place-items-center rounded-xl border border-line-strong bg-surface text-accent transition-transform duration-300 group-hover:scale-105">
        <CategoryIcon name={icon} className="size-5" />
      </span>
      <span className="relative font-mono text-[0.6875rem] tracking-[0.12em] text-fg-subtle uppercase">{label}</span>
    </div>
  );
}

/**
 * Project screenshots and diagrams. Images are URLs entered in the admin dashboard
 * (an external host or a file in public/), so a plain <img> is used: optimising
 * arbitrary remote hosts through next/image would let anyone spend the image quota.
 */
export function ProjectImageView({
  image,
  eager,
  className,
}: {
  image: ProjectImage;
  /** Load immediately (use for the main above-the-fold image only). */
  eager?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.alt}
      width={image.width ?? DEFAULT_IMAGE_SIZE.width}
      height={image.height ?? DEFAULT_IMAGE_SIZE.height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
