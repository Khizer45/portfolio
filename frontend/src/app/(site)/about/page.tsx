import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { CvButton } from "@/components/cv-button";
import { PersonJsonLd } from "@/components/person-json-ld";
import { BulletList } from "@/components/projects/project-details";
import { Tag } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { cvLink, getEducation, getProfile, paragraphs } from "@/lib/content";
import { initials } from "@/lib/format";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Khizer Hayat — Software Engineering graduate from MUST, Pakistan, focused on AI, machine learning, backend systems, and automation.",
  alternates: { canonical: "/about" },
};

export const revalidate = 300;

export default async function AboutPage() {
  const [profile, education] = await Promise.all([getProfile(), getEducation()]);
  const [lead, ...rest] = paragraphs(profile.biography);
  const primaryEducation = education.find((e) => e.is_primary) ?? education[0];

  return (
    <>
      <PersonJsonLd profile={profile} education={primaryEducation} />
      <PageHeader eyebrow="About" title="About me" description={lead} />

      <Container className="py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="space-y-14">
            {rest.length > 0 && (
              <section aria-label="Background" className="space-y-5 text-lg leading-relaxed text-pretty text-fg-muted">
                {rest.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            )}

            {profile.career_interests.length > 0 && (
              <section aria-labelledby="roles-heading">
                <SectionHeading id="roles-heading" title="Roles I'm pursuing" />
                <ul className="flex flex-wrap gap-2">
                  {profile.career_interests.map((role) => (
                    <li key={role}>
                      <Tag>{role}</Tag>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {profile.interests.length > 0 && (
              <section aria-labelledby="interests-heading">
                <SectionHeading id="interests-heading" title="What I'm interested in" />
                <BulletList items={profile.interests} />
              </section>
            )}

            {profile.approach.length > 0 && (
              <section aria-labelledby="approach-heading">
                <SectionHeading id="approach-heading" title="How I work" />
                <BulletList items={profile.approach} />
              </section>
            )}

            {profile.seeking.length > 0 && (
              <section aria-labelledby="seeking-heading">
                <SectionHeading id="seeking-heading" title="What I'm looking for" />
                <BulletList items={profile.seeking} />
              </section>
            )}
          </div>

          <aside className="order-first lg:sticky lg:top-24 lg:order-none lg:self-start" aria-label="Profile summary">
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex items-center gap-4 lg:block">
                {profile.profile_image_url ? (
                  // The image URL is set in the admin dashboard and may be on any host, so next/image is not used.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profile_image_url}
                    alt={`Portrait of ${profile.display_name}`}
                    width={320}
                    height={320}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="size-20 shrink-0 rounded-xl border border-line bg-surface-muted object-cover object-top sm:size-24 lg:aspect-square lg:size-auto lg:w-full"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-16 shrink-0 place-items-center rounded-2xl border border-accent-line bg-accent-soft font-mono text-lg font-semibold text-accent"
                  >
                    {initials(profile.display_name)}
                  </span>
                )}
                <div className="min-w-0 lg:mt-5">
                  <p className="text-lg font-semibold">{profile.display_name}</p>
                  {profile.role && <p className="text-sm text-fg-muted">{profile.role}</p>}
                </div>
              </div>

              {(profile.location || profile.spoken_languages.length > 0) && (
                <dl className="mt-6 space-y-4 border-t border-line pt-6 text-sm">
                  {profile.location && (
                    <div className="flex gap-2.5">
                      <dt>
                        <MapPin className="mt-0.5 size-4 text-fg-subtle" aria-hidden="true" />
                        <span className="sr-only">Location</span>
                      </dt>
                      <dd className="text-fg-muted">{profile.location}</dd>
                    </div>
                  )}
                  {profile.spoken_languages.length > 0 && (
                    <div>
                      <dt className="text-fg-subtle">Languages</dt>
                      <dd className="mt-1 text-fg-muted">{profile.spoken_languages.join(", ")}</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="mt-6 flex flex-col">
                <CvButton url={cvLink(profile)} name={profile.display_name} variant="primary" />
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
