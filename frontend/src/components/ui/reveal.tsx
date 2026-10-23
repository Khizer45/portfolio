"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/format";

/**
 * Fades its content in when it scrolls into view. Without JavaScript, or with reduced
 * motion, the content is simply visible (see `.motion-ok` in globals.css).
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Stagger in milliseconds. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    // A position check, not IntersectionObserver: a fast scroll or a jump to an anchor can
    // skip past an element without it ever intersecting, which would leave it hidden.
    const check = () => {
      frame = 0;
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
        setShown(true);
        stop();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    const stop = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    check();
    return stop;
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal={shown ? "shown" : "pending"}
      style={delay ? ({ "--delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
