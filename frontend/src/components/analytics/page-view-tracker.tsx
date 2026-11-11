"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Counts a visit to each public page for the admin dashboard. No cookies and nothing that
 * identifies the visitor are stored; visitors who ask not to be tracked (Do Not Track) and
 * automated browsers are skipped.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (navigator.doNotTrack === "1" || navigator.webdriver) return;
    // Where the visitor came from only matters for the page they landed on.
    const referrer = first.current && document.referrer ? document.referrer : null;
    first.current = false;
    fetch("/api/v1/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
