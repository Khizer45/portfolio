import { Award, BadgeCheck, FileText } from "lucide-react";
import type { Metadata } from "next";

import { ArrowLink } from "@/components/ui/arrow-link";
import { Tag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { getAchievementGroups, getCertifications } from "@/lib/content";
import { formatMonth } from "@/lib/format";
import { achievementTypeMeta } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Certifications",
  description: "Certifications, completed courses, awards, and publications of Khizer Hayat.",
  alternates: { canonical: "/certifications" },
};

export const revalidate = 300;

export default async function CertificationsPage() {
  const [certifications, achievementGroups] = await Promise.all([getCertifications(), getAchievementGroups()]);

  return (
    <>
      <PageHeader
        eyebrow="Credentials"
        title="Certifications"
        description="Certifications and completed courses, each with a link to verify it where the issuer provides one."
      />

      <Container className="py-12 sm:py-16">
        <section aria-labelledby="certs-heading">
          <h2 id="certs-heading" className="sr-only">
            Certifications
          </h2>
          {certifications.length > 0 ? (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {certifications.map((cert) => (
                <li key={cert.id} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-accent-line bg-accent-soft text-accent">
                      <BadgeCheck className="size-5" aria-hidden="true" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-fg">{cert.name}</h3>
                      <p className="mt-0.5 text-sm text-fg-muted">{cert.issuer}</p>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-fg-subtle">Issued</dt>
                      <dd className="mt-0.5 font-mono text-fg">{formatMonth(cert.issue_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Expires</dt>
                      <dd className="mt-0.5 font-mono text-fg">
                        {cert.expiration_date ? formatMonth(cert.expiration_date) : "No expiry"}
                      </dd>
                    </div>
                    {cert.credential_id && (
                      <div className="col-span-2">
                        <dt className="text-fg-subtle">Credential ID</dt>
                        <dd className="mt-0.5 font-mono break-all text-fg">{cert.credential_id}</dd>
                      </div>
                    )}
                  </dl>
                  {cert.description && <p className="mt-5 text-sm leading-relaxed text-fg-muted">{cert.description}</p>}
                  {cert.related_skills.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Skills">
                      {cert.related_skills.map((skill) => (
                        <li key={skill}>
                          <Tag>{skill}</Tag>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(cert.verification_url || cert.file_url) && (
                    <div className="mt-auto flex flex-wrap gap-3 pt-6">
                      {cert.verification_url && (
                        <ButtonLink href={cert.verification_url} external size="sm">
                          <BadgeCheck aria-hidden="true" /> Verify credential
                          <span className="sr-only">(opens in a new tab)</span>
                        </ButtonLink>
                      )}
                      {cert.file_url && (
                        <ButtonLink href={cert.file_url} external variant="secondary" size="sm">
                          <FileText aria-hidden="true" /> View certificate
                          <span className="sr-only">(opens in a new tab)</span>
                        </ButtonLink>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Award}
              title="Certifications will be added as completed"
              description="Verified certificates and completed courses will be listed here with links to confirm them."
            />
          )}
        </section>

        {achievementGroups.map((group) => (
          <section key={group.type} aria-labelledby={`achievements-${group.type}`} className="mt-20">
            <SectionHeading id={`achievements-${group.type}`} title={achievementTypeMeta[group.type].title} />
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {group.items.map((item) => (
                <li key={item.id} className="p-5 sm:px-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-medium text-fg">{item.title}</h3>
                    <p className="font-mono text-xs text-fg-subtle">{formatMonth(item.date)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-fg-muted">{item.issuer}</p>
                  {item.description && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.description}</p>}
                  {item.url && (
                    <div className="mt-3">
                      <ArrowLink href={item.url} external>
                        View
                      </ArrowLink>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  );
}
