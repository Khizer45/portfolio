import { ArrowUpRight, CornerDownRight, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { CopyButton } from "@/components/copy-button";
import { CvButton } from "@/components/cv-button";
import { Container } from "@/components/ui/container";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { cvLink, getProfile } from "@/lib/content";
import { displayUrl, hostname } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Khizer Hayat about software engineering, AI engineering, and backend roles or freelance projects.",
  alternates: { canonical: "/contact" },
};

export const revalidate = 300;

type Channel = {
  label: string;
  description: string;
  href: string;
  display: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default async function ContactPage() {
  const profile = await getProfile();
  const email = profile.contact_email;

  const channels: Channel[] = [
    ...(profile.linkedin_url
      ? [
          {
            label: "LinkedIn",
            description: "Connect or send a message.",
            href: profile.linkedin_url,
            display: displayUrl(profile.linkedin_url),
            icon: LinkedInIcon,
          },
        ]
      : []),
    ...(profile.github_url
      ? [
          {
            label: "GitHub",
            description: "Browse my code and repositories.",
            href: profile.github_url,
            display: displayUrl(profile.github_url),
            icon: GitHubIcon,
          },
        ]
      : []),
    ...profile.social_links.map((link) => ({
      label: link.label,
      description: hostname(link.url),
      href: link.url,
      display: hostname(link.url),
      icon: ArrowUpRight,
    })),
  ];

  const description = [
    profile.availability_open && profile.availability_label ? `${profile.availability_label}.` : "",
    email ? "Send a message below, or reach me on the channels listed." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description={description || undefined}
      />
      <Container className="py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            {email && (
              <div>
                <p className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">Email</p>
                <a
                  href={`mailto:${email}`}
                  className="mt-3 block font-display text-xl font-semibold break-all text-fg transition-colors hover:text-accent sm:text-2xl"
                >
                  {email}
                </a>
                <div className="mt-4">
                  <CopyButton value={email} label="Copy address" />
                </div>
              </div>
            )}
            {channels.length > 0 && (
              <div className={email ? "mt-10" : undefined}>
                <p className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">Elsewhere</p>
                <ul className="mt-3 space-y-1">
                  {channels.map(({ label, href, display }) => (
                    <li key={href}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex max-w-full min-w-0 items-baseline gap-3 py-1 text-xl text-fg transition-colors hover:text-accent"
                      >
                        <CornerDownRight className="size-4 shrink-0 self-center text-fg-subtle transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
                        {label}
                        <span className="min-w-0 truncate font-mono text-xs text-fg-subtle">{display}</span>
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-10 space-y-5 border-t border-line pt-8">
              {profile.location && (
                <p className="flex items-center gap-2.5 text-fg-muted">
                  <MapPin className="size-4 text-accent" aria-hidden="true" />
                  Based in {profile.location}
                </p>
              )}
              <CvButton url={cvLink(profile)} name={profile.display_name} size="sm" />
            </div>
          </Reveal>

          {email && (
            <Reveal delay={80} className="lg:col-span-7">
              <h2 className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">Send a message</h2>
              <div className="mt-6">
                <ContactForm email={email} />
              </div>
            </Reveal>
          )}
        </div>
      </Container>
    </>
  );
}
