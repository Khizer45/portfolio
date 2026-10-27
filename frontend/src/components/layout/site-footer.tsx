import { Link2, Mail } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { GitHubIcon, LinkedInIcon, WhatsAppIcon } from "@/components/ui/icons";
import type { NavItem } from "@/data/site";
import type { Profile } from "@/types/api";

type ProfileLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; external: boolean };

export function isWhatsApp(url: string) {
  return /^https?:\/\/(wa\.me|(api\.|web\.)?whatsapp\.com)\//i.test(url);
}

/** Every way to reach the owner, as icon links: GitHub, LinkedIn, other profiles (WhatsApp, …), email. */
export function profileLinks(profile: Profile): ProfileLink[] {
  const firstName = profile.display_name.split(/\s+/)[0];
  const links: ProfileLink[] = [];
  if (profile.github_url) links.push({ href: profile.github_url, label: "GitHub", icon: GitHubIcon, external: true });
  if (profile.linkedin_url) links.push({ href: profile.linkedin_url, label: "LinkedIn", icon: LinkedInIcon, external: true });
  for (const link of profile.social_links) {
    const whatsapp = isWhatsApp(link.url);
    links.push({
      href: link.url,
      label: whatsapp ? `WhatsApp ${firstName}` : link.label,
      icon: whatsapp ? WhatsAppIcon : Link2,
      external: true,
    });
  }
  if (profile.contact_email) {
    links.push({ href: `mailto:${profile.contact_email}`, label: `Email ${firstName}`, icon: Mail, external: false });
  }
  return links;
}

const tones = {
  default: "border-line text-fg-muted hover:border-line-strong hover:text-fg",
  inverse: "border-footer-line text-footer-muted hover:border-footer-fg hover:text-footer-fg",
};

const iconSizes = {
  md: { link: "size-10 rounded-lg", icon: "size-[1.125rem]" },
  lg: { link: "size-14 rounded-xl", icon: "size-6" },
};

/**
 * Icon-only contact links (no addresses or URLs written out). Each has an accessible
 * name and a tooltip.
 */
export function SocialLinks({
  profile,
  className,
  size = "md",
  tone = "default",
}: {
  profile: Profile;
  className?: string;
  size?: keyof typeof iconSizes;
  /** "inverse" for the dark footer block. */
  tone?: keyof typeof tones;
}) {
  const links = profileLinks(profile);
  if (links.length === 0) return null;
  return (
    <ul className={className ?? "flex items-center gap-2"} aria-label="Profiles">
      {links.map(({ href, label, icon: Icon, external }) => (
        <li key={href}>
          <a
            href={href}
            title={label}
            aria-label={external ? `${label} (opens in a new tab)` : label}
            className={`${iconSizes[size].link} grid place-items-center border transition-colors ${tones[tone]}`}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <Icon className={iconSizes[size].icon} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({ profile, items }: { profile: Profile; items: readonly NavItem[] }) {
  const year = new Date().getFullYear();
  const links = items.filter((item) => item.href !== "/");
  const linkClasses = "inline-block py-1 text-footer-muted transition-colors hover:text-footer-fg";
  const labelClasses = "font-mono text-[0.6875rem] tracking-[0.14em] text-footer-muted uppercase";
  return (
    <footer className="site-footer mt-auto bg-footer text-footer-fg">
      <Container className="grid gap-10 py-14 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:gap-16">
        <div className="max-w-sm">
          <p className="font-display text-lg font-semibold">{profile.display_name}</p>
          {(profile.footer_text || profile.role) && (
            <p className="mt-2 text-sm leading-relaxed text-footer-muted">{profile.footer_text || profile.role}</p>
          )}
        </div>
        <nav aria-label="Footer">
          <p className={labelClasses}>Pages</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-10 gap-y-0.5 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                {/^https?:\/\//.test(link.href) ? (
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                    {link.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <Link href={link.href} className={linkClasses}>
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {profileLinks(profile).length > 0 && (
          <div>
            <p className={labelClasses}>Contact</p>
            <SocialLinks profile={profile} tone="inverse" className="mt-4 flex flex-wrap items-center gap-2" />
          </div>
        )}
      </Container>
      <Container>
        <div className="flex items-center justify-between gap-4 border-t border-footer-line py-6 text-xs text-footer-muted">
          <p>
            © {year} {profile.display_name}
          </p>
          <Link href="/admin" className="transition-colors hover:text-footer-fg">
            Admin
          </Link>
        </div>
      </Container>
    </footer>
  );
}
