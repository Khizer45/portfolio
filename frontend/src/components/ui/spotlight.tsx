"use client";

import { useEffect } from "react";

/**
 * Feeds the pointer position to `.spotlight` cards (one listener for the whole page), so a
 * soft light follows the cursor across the card under it. Mouse and pen only; skipped when
 * the visitor prefers reduced motion.
 */
export function SpotlightTracker() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const update = () => {
      frame = 0;
      const card = (last?.target as Element | null)?.closest<HTMLElement>(".spotlight");
      if (!card || !last) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${last.clientX - box.left}px`);
      card.style.setProperty("--my", `${last.clientY - box.top}px`);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      last = event;
      if (!frame) frame = requestAnimationFrame(update);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
