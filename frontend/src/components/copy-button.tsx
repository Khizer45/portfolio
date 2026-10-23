"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/button";

export function CopyButton({ value, label, size = "sm" }: { value: string; label: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked; the visible address can still be selected manually.
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonClasses({ variant: "secondary", size })}>
      {copied ? <Check className="text-tone-emerald" aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
