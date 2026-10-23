import { Download } from "lucide-react";

import { buttonClasses, ButtonLink } from "@/components/ui/button";

/**
 * Download button for the CV (set in Admin → Profile). Without a CV link it shows a
 * clearly labelled placeholder instead of a broken link.
 */
export function CvButton({
  url,
  name,
  variant = "secondary",
  size = "md",
}: {
  url: string | null;
  name: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
}) {
  if (!url) {
    return (
      <span aria-disabled="true" className={buttonClasses({ variant: "secondary", size, className: "cursor-not-allowed opacity-60" })}>
        CV coming soon
      </span>
    );
  }
  const local = url.startsWith("/");
  return (
    <ButtonLink
      href={url}
      // A local PDF downloads directly; an external link (e.g. Google Drive) opens in a new tab.
      download={local ? `${name.replace(/\s+/g, "-")}-CV.pdf` : undefined}
      external={!local}
      variant={variant}
      size={size}
    >
      <Download aria-hidden="true" />
      Download CV
      <span className="sr-only">{local ? "(PDF)" : "(opens in a new tab)"}</span>
    </ButtonLink>
  );
}
