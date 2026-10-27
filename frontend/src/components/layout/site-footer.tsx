import { Link2, Mail } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { GitHubIcon, LinkedInIcon, WhatsAppIcon } from "@/components/ui/icons";
import type { NavItem } from "@/data/site";
import type { Profile } from "@/types/api";

type ProfileLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; external: boolean };

function isWhatsApp(url: string) {
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
}: {
  profile: Profile;
  className?: string;
  size?: keyof typeof iconSizes;
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
            className={`${iconSizes[size].link} grid place-items-center border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg`}
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
  return (
    <footer className="mt-auto border-t border-line">
      <Container className="flex flex-col gap-10 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-lg font-semibold">{profile.display_name}</p>
          {(profile.footer_text || profile.role) && (
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{profile.footer_text || profile.role}</p>
          )}
          <SocialLinks profile={profile} className="mt-5 flex items-center gap-2" />
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-12 gap-y-1 text-sm sm:grid-cols-3">
            {links.map((link) => (
              <li key={link.href}>
                {/^https?:\/\//.test(link.href) ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-1 text-fg-muted transition-colors hover:text-fg"
                  >
                    {link.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <Link href={link.href} className="inline-block py-1 text-fg-muted transition-colors hover:text-fg">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container>
        <div className="flex items-center justify-between gap-4 border-t border-line py-6 text-xs text-fg-subtle">
          <p>
            © {year} {profile.display_name}
          </p>
          <Link href="/admin" className="transition-colors hover:text-fg">
            Admin
          </Link>
        </div>
      </Container>
    </footer>
  );
}
