import { cn } from "@/lib/format";
import type { Tone } from "@/lib/labels";

const toneDot: Record<Tone, string> = {
  neutral: "bg-tone-neutral",
  amber: "bg-tone-amber",
  violet: "bg-tone-violet",
  emerald: "bg-tone-emerald",
  blue: "bg-tone-blue",
};

export function ToneDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-1.5 shrink-0 rounded-full", toneDot[tone], className)} />;
}

/** Status pill: colored dot + text label. The label carries the meaning, so color is never the only signal. */
export function StatusBadge({ label, tone, className, title }: { label: string; tone: Tone; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-0.5 font-mono text-[0.6875rem] font-medium tracking-wide text-fg-muted uppercase",
        className,
      )}
    >
      <ToneDot tone={tone} />
      {label}
    </span>
  );
}

/** Neutral tag for technologies and topics. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line-strong bg-surface/70 px-2 py-0.5 font-mono text-[0.6875rem] leading-5 text-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small uppercase label above headings, led by a short accent rule. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2.5 font-mono text-xs font-medium tracking-[0.12em] text-accent uppercase", className)}>
      <span aria-hidden="true" className="h-0.5 w-5 shrink-0 bg-accent" />
      {children}
    </p>
  );
}

/** A measured result as a compact chip, e.g. "94% · cancellations caught". */
export function MetricChip({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-md border border-accent-line bg-accent-soft px-2 py-0.5 text-[0.75rem] leading-5 text-fg-muted",
        className,
      )}
    >
      <span className="font-mono font-semibold text-accent">{value}</span>
      {label}
    </span>
  );
}
