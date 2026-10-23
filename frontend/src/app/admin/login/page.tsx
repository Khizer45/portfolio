"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { site } from "@/data/site";
import { ApiError } from "@/features/admin/api";
import { safeNextPath, useAuth } from "@/features/admin/auth";
import { inputClass } from "@/features/admin/form/fields";
import { Spinner } from "@/features/admin/ui";
import { cn } from "@/lib/format";

function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("expired") ? "Your session expired. Please sign in again." : null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (auth.status === "authenticated") router.replace(next);
  }, [auth.status, next, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found: typeof fieldErrors = {};
    if (!email.trim()) found.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) found.email = "Enter a valid email address.";
    if (!password) found.password = "Enter your password.";
    setFieldErrors(found);
    if (Object.keys(found).length) {
      // Move to the first invalid field so its error (aria-describedby) is read out.
      requestAnimationFrame(() => document.getElementById(found.email ? "email" : "password")?.focus());
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await auth.login(email.trim(), password);
      router.replace(next);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 401 || e.status === 429 || e.status === 403
            ? e.message
            : e.status === 0
              ? e.message
              : "Sign-in failed. Please try again."
          : "Sign-in failed. Please try again.",
      );
      setPassword("");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.status === "loading" || auth.status === "authenticated") {
    return <Spinner label={auth.status === "loading" ? "Checking your session…" : "Signing you in…"} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-tone-amber/40 bg-tone-amber/[0.06] px-3 py-2.5 text-sm text-fg focus:outline-none">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className={cn(inputClass, "h-11")}
          autoFocus
        />
        {fieldErrors.email && (
          <p id="email-error" className="mt-1.5 text-xs font-medium text-tone-amber">
            {fieldErrors.email}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          className={cn(inputClass, "h-11")}
        />
        {fieldErrors.password && (
          <p id="password-error" className="mt-1.5 text-xs font-medium text-tone-amber">
            {fieldErrors.password}
          </p>
        )}
      </div>
      <button type="submit" disabled={submitting} className={buttonClasses({ className: "w-full" })}>
        {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-12">
      <title>{`Sign in · Admin · ${site.ownerName}`}</title>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl border border-accent-line bg-accent-soft text-accent">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sign in to the admin</h1>
          <p className="mt-1 text-sm text-fg-muted">For the site owner only. There is no public registration.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <Suspense fallback={<Spinner />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-fg-muted hover:text-fg">
            ← Back to the site
          </Link>
        </p>
      </div>
    </main>
  );
}
