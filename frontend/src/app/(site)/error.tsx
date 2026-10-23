"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-20 sm:py-28">
      <p className="font-mono text-sm text-accent">Error</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Something went wrong</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-fg-muted">
        This page failed to load. Try again, or return to the home page.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className={buttonClasses()}>
          <RotateCcw aria-hidden="true" /> Try again
        </button>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Back to home
        </Link>
      </div>
    </Container>
  );
}
