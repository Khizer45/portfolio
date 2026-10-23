import { Mail } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/icons";
import type { Profile } from "@/types/api";

const columns = [
  {
    title: "Work",
    links: [
      { label: "Projects", href: "/projects" },
      { label: "Skills", href: "/skills" },
      { label: "Experience", href: "/experience" },
      { label: "Certifications", href: "/certifications" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "About", href: "/about" },
      { label: "Writing", href: "/writing" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SocialLinks({ profile, className }: { profile: Profile; className?: string }) {
  const iconLink =
    "grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg";
  return (
    <ul className={className ?? "flex items-center gap-2"}>
      {profile.github_url && (
        <li>
          <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className={iconLink}>
            <GitHubIcon className="size-4" />
            <span className="sr-only">GitHub (opens in a new tab)</span>
          </a>
        </li>
      )}
      {profile.linkedin_url && (
        <li>
          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className={iconLink}>
            <LinkedInIcon className="size-4" />
            <span className="sr-only">LinkedIn (opens in a new tab)</span>
          </a>
        </li>
      )}
      {profile.contact_email && (
        <li>
          <a href={`mailto:${profile.contact_email}`} className={iconLink}>
            <Mail className="size-4" aria-hidden="true" />
            <span className="sr-only">Email {profile.contact_email}</span>
          </a>
        </li>
      )}
    </ul>
  );
}

export function SiteFooter({ profile, cvUrl }: { profile: Profile; cvUrl: string | null }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line">
      <Container className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-sm">
          <p className="font-display text-lg font-semibold">{profile.display_name}</p>
          {profile.role && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{profile.role}</p>}
          {profile.contact_email && (
            <a
              href={`mailto:${profile.contact_email}`}
              className="mt-4 inline-block text-sm text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-current"
            >
              {profile.contact_email}
            </a>
          )}
          <SocialLinks profile={profile} className="mt-5 flex items-center gap-2" />
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:gap-16">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">{column.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-fg-muted transition-colors hover:text-fg">
                      {link.label}
                    </Link>
                  </li>
                ))}
                {column.title === "More" && cvUrl && (
                  <li>
                    <a href={cvUrl} download className="text-fg-muted transition-colors hover:text-fg">
                      Download CV
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
      </Container>
      <Container>
        <div className="flex flex-col gap-2 border-t border-line py-6 text-xs text-fg-subtle sm:flex-row sm:justify-between">
          <p>
            © {year} {profile.display_name}
          </p>
          <p>
            Built with Next.js, FastAPI, and PostgreSQL ·{" "}
            <Link href="/admin" className="hover:text-fg">
              Admin
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  );
}
