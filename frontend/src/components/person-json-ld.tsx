import { getSiteUrl } from "@/lib/site-url";
import type { Education, Profile } from "@/types/api";

/** schema.org Person data so search engines can identify the site owner. */
export function PersonJsonLd({ profile, education }: { profile: Profile; education?: Education }) {
  const sameAs = [profile.github_url, profile.linkedin_url, ...profile.social_links.map((l) => l.url)].filter(Boolean);
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.display_name,
    url: getSiteUrl(),
    jobTitle: "Software Engineer",
    ...(profile.contact_email ? { email: `mailto:${profile.contact_email}` } : {}),
    ...(profile.location ? { address: { "@type": "PostalAddress", addressLocality: profile.location } } : {}),
    sameAs,
    ...(education ? { alumniOf: { "@type": "CollegeOrUniversity", name: education.institution } } : {}),
    knowsLanguage: profile.spoken_languages,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
