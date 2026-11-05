"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";

import { Container } from "@/components/ui/container";

/**
 * A full-width strip of items that scrolls slowly and loops. The pause button keeps it
 * WCAG 2.2.2 compliant; with reduced motion the strip is a static, wrapped list instead.
 */
export function Marquee({ id, title, items }: { id: string; title: string; items: string[] }) {
  const [paused, setPaused] = useState(false);
  const duration = `${Math.max(24, items.length * 3)}s`;

  return (
    <>
      <Container className="flex items-center justify-center gap-2">
        <h2 id={id} className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-subtle uppercase">
          {title}
        </h2>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
          className="marquee-toggle grid size-7 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
        >
          {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
          <span className="sr-only">Pause the moving list</span>
        </button>
      </Container>
      <div className="marquee mt-5" data-paused={paused || undefined}>
        <ul
          aria-labelledby={id}
          className="marquee-track gap-3 px-1.5 py-1"
          style={{ "--marquee-duration": duration } as React.CSSProperties}
        >
          {[...items, ...items].map((item, index) => {
            // The second copy only makes the loop seamless.
            const duplicate = index >= items.length;
            return (
              <li
                key={`${item}-${index}`}
                data-duplicate={duplicate || undefined}
                aria-hidden={duplicate || undefined}
                className="card flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap text-fg"
              >
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
