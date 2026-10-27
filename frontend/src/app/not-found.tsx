import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { navigation as allNavigation } from "@/data/site";
import { FALLBACK_PROFILE, getNavigation, getProfile } from "@/lib/content";
import type { Profile } from "@/types/api";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const suggestions = [
  { href: "/projects", label: "Projects", description: "Case studies and work in progress" },
  { href: "/skills", label: "Skills", description: "Languages, frameworks, and tools" },
  { href: "/experience", label: "Experience", description: "Internships and work history" },
  { href: "/contact", label: "Contact", description: "Send a message or find my profiles" },
];

/** The 404 page must always render, even when the API is unreachable. */
async function loadProfile(): Promise<Profile> {
  try {
    return await getProfile();
  } catch {
    return FALLBACK_PROFILE;
  }
}

/**
 * Root-level 404. It renders outside the (site) layout (it also handles unmatched URLs for the whole
 * app), so it adds the public header and footer itself.
 */
export default async function NotFound() {
  const profile = await loadProfile();
  const navigation = await getNavigation(profile).catch(() => allNavigation);

  return (
    <>
      <SiteHeader name={profile.display_name} items={navigation} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Container className="py-20 sm:py-28">
          <p className="font-mono text-sm text-accent">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-fg-muted">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Try one of these instead.
          </p>
          <ul className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <span>
                    <span className="block font-medium text-fg">{item.label}</span>
                    <span className="block text-sm text-fg-muted">{item.description}</span>
                  </span>
                  <ArrowRight
                    className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <ButtonLink href="/" variant="secondary">
              Back to home
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter profile={profile} items={navigation} />
    </>
  );
}
