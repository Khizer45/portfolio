import { Container } from "@/components/ui/container";

/**
 * Shown while a public page renders for the first time, e.g. while the free-tier API wakes
 * up. Cached pages are served instantly and never show this.
 */
export default function Loading() {
  return (
    <Container className="pt-16 pb-24 sm:pt-24">
      <div role="status" aria-live="polite" className="animate-pulse motion-reduce:animate-none">
        <span className="sr-only">Loading…</span>
        <div className="h-3 w-28 rounded bg-surface-muted" />
        <div className="mt-6 h-12 w-3/4 max-w-xl rounded-lg bg-surface-muted" />
        <div className="mt-6 h-4 w-full max-w-2xl rounded bg-surface-muted" />
        <div className="mt-3 h-4 w-2/3 max-w-xl rounded bg-surface-muted" />
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          <div className="h-64 card rounded-2xl" />
          <div className="h-64 card rounded-2xl" />
        </div>
      </div>
    </Container>
  );
}
