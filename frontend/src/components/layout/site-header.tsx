import Link from "next/link";

import { HeaderNav } from "@/components/layout/header-nav";
import { Container } from "@/components/ui/container";
import type { NavItem } from "@/data/site";
import { initials } from "@/lib/format";

export function SiteHeader({ name, items }: { name: string; items: readonly NavItem[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line">
      {/* Blur lives on its own layer: backdrop-filter on the header would trap the fixed mobile menu inside it. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-bg/80 backdrop-blur-md" />
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5 rounded-md">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-md border border-[var(--btn-border)] bg-accent-fill font-mono text-[0.75rem] font-bold text-accent-fill-fg shadow-[var(--btn-shadow)] transition-transform duration-200 group-hover:-rotate-6"
          >
            {initials(name)}
          </span>
          <span className="font-display text-[0.9375rem] font-semibold tracking-tight">{name}</span>
          <span className="sr-only">, home</span>
        </Link>
        <HeaderNav items={items} />
      </Container>
    </header>
  );
}
