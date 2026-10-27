import { ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Clock, FolderOpen, Mail, MapPin } from "lucide-react";
import Link from "next/link";

import { isWhatsApp } from "@/components/layout/site-footer";
import { PersonJsonLd } from "@/components/person-json-ld";
import { ProjectGrid } from "@/components/projects/project-card";
import { ArrowLink } from "@/components/ui/arrow-link";
import { Tag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import {
  getCertifications,
  getExperience,
  getPrimaryEducation,
  getProfile,
  getProjects,
  getSkillGroups,
} from "@/lib/content";
import { formatMonth, formatRange } from "@/lib/format";
import { employmentTypeLabel } from "@/lib/labels";

export const revalidate = 300;

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

const tileClasses = "card rounded-2xl p-5";
const tileLabelClasses = "flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.1em] text-fg-subtle uppercase";

export default async function HomePage() {
  const [profile, projects, skillGroups, allExperience, education, allCertifications] = await Promise.all([
    getProfile(),
    getProjects(),
    getSkillGroups({ featuredOnly: true }),
    getExperience(),
    getPrimaryEducation(),
    getCertifications(),
  ]);

  const featured = projects.filter((p) => p.is_featured);
  // Set in Admin → Profile; until then, the projects marked "in progress".
  const building =
    profile.currently_building.length > 0
      ? profile.currently_building
      : projects
          .filter((p) => p.status === "in_progress")
          .map((p) => ({ title: p.title, description: p.subtitle, url: `/projects/${p.slug}` }));
  const experience = allExperience.slice(0, 2);
  const certifications = allCertifications.slice(0, 3);
  const technologyUse = new Map<string, number>();
  for (const tech of projects.flatMap((p) => p.technologies)) technologyUse.set(tech, (technologyUse.get(tech) ?? 0) + 1);
  // Ordered by how many published projects use each technology; ties keep project order.
  const topTechnologies = [...technologyUse.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tech]) => tech);
  const whatsapp = profile.social_links.find((link) => isWhatsApp(link.url));
  const details = [
    { icon: BriefcaseBusiness, text: profile.work_preference },
    { icon: MapPin, text: profile.location },
    { icon: Clock, text: profile.timezone },
  ].filter((detail) => detail.text);
  // "Software Engineer · AI/ML Engineer" → separate items, so a long role wraps between titles, not inside one.
  const roles = profile.role.split(/\s*[·•|]\s*/).filter(Boolean);

  return (
    <>
      <PersonJsonLd profile={profile} education={education} />

      {/* Hero */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-line">
        <Container className="relative grid grid-cols-1 gap-10 pt-10 pb-14 sm:gap-12 sm:pt-20 sm:pb-24 lg:grid-cols-12 lg:gap-10 lg:pt-24">
          <div className="lg:col-span-7">
            {profile.profile_image_url && (
              // Not faded in: it is above the fold. Set in Admin → Profile, so next/image is not used.
              <div className="card mb-8 flex w-fit rounded-full p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.profile_image_url}
                  alt={`Portrait of ${profile.display_name}`}
                  width={160}
                  height={160}
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                  className="size-28 rounded-full bg-surface-muted object-cover object-top sm:size-32 lg:size-36"
                />
              </div>
            )}
            {roles.length > 0 && (
              <ul
                aria-label="Roles"
                className="animate-enter flex flex-wrap gap-2 font-mono text-[0.6875rem] tracking-[0.08em] text-accent uppercase sm:text-xs"
                style={delay(60)}
              >
                {roles.map((role) => (
                  <li
                    key={role}
                    className="rounded-md border border-accent-line bg-accent-soft px-2 py-1 whitespace-nowrap sm:px-2.5"
                  >
                    {role}
                  </li>
                ))}
              </ul>
            )}
            <h1
              id="hero-heading"
              className="mt-5 text-5xl leading-[0.95] font-semibold tracking-[-0.04em] sm:text-7xl lg:text-[5.25rem]"
            >
              {profile.display_name}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-snug text-balance text-fg sm:mt-7 sm:text-2xl">
              {profile.headline}
            </p>
            {profile.intro && (
              <p
                className="animate-enter mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-pretty text-fg-muted sm:mt-5 sm:text-base"
                style={delay(220)}
              >
                {profile.intro}
              </p>
            )}
            <div className="animate-enter mt-8 sm:mt-9" style={delay(260)}>
              <ButtonLink href="/projects" className="w-full sm:w-auto">
                View projects
                <ArrowRight aria-hidden="true" className="group-hover/button:translate-x-0.5" />
              </ButtonLink>
            </div>
            {topTechnologies.length > 0 && (
              <div className="animate-enter mt-9 sm:mt-10" style={delay(300)}>
                <p className={tileLabelClasses}>Most used in my projects</p>
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Most used technologies">
                  {topTechnologies.map((tech) => (
                    <li key={tech}>
                      <Tag>{tech}</Tag>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside aria-label="Availability" className="grid grid-cols-1 gap-3 lg:col-span-5 lg:self-center">
            {/* Open-to-work card: everything in it is set in Admin → Profile → Availability. */}
            <div className="animate-enter relative overflow-hidden card rounded-2xl p-6 sm:p-7" style={delay(160)}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-linear-to-br from-accent-soft via-transparent to-transparent"
              />
              <div className="relative">
                {profile.availability_open && profile.availability_label && (
                  <p className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                    <span aria-hidden="true" className="relative flex size-2">
                      <span className="animate-ping-soft absolute inset-0 rounded-full bg-accent" />
                      <span className="relative size-2 rounded-full bg-accent" />
                    </span>
                    {profile.availability_label}
                  </p>
                )}
                <h2 className="mt-5 font-display text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-[1.75rem]">
                  {profile.availability_heading || "Let's work together."}
                </h2>
                {profile.availability_note && (
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-pretty text-fg-muted">
                    {profile.availability_note}
                  </p>
                )}
                {details.length > 0 && (
                  <ul className="mt-6 space-y-3 text-sm text-fg-muted">
                    {details.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-start gap-3">
                        <Icon className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                        {text}
                      </li>
                    ))}
                  </ul>
                )}
                {(profile.contact_email || whatsapp) && (
                  <div className="mt-7 flex flex-wrap gap-3">
                    {profile.contact_email && (
                      <ButtonLink href={`mailto:${profile.contact_email}`} className="flex-1 sm:flex-none">
                        <Mail aria-hidden="true" />
                        Email me
                      </ButtonLink>
                    )}
                    {whatsapp && (
                      <ButtonLink href={whatsapp.url} external variant="secondary" className="flex-1 sm:flex-none">
                        <WhatsAppIcon aria-hidden="true" />
                        WhatsApp
                        <span className="sr-only">(opens in a new tab)</span>
                      </ButtonLink>
                    )}
                  </div>
                )}
              </div>
            </div>

            {building.length > 0 && (
              <div className={`${tileClasses} animate-enter`} style={delay(220)}>
                <h2 className={tileLabelClasses}>Currently building</h2>
                <ul className="mt-3 space-y-0.5">
                  {building.map((item) => {
                    const label = (
                      <span className="min-w-0 truncate text-sm">
                        <span className="font-medium text-fg">{item.title}</span>
                        {item.description && <span className="text-fg-subtle"> — {item.description}</span>}
                      </span>
                    );
                    const rowClasses = "-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5";
                    if (!item.url) {
                      return (
                        <li key={item.title} className={rowClasses}>
                          {label}
                        </li>
                      );
                    }
                    const external = /^https?:\/\//.test(item.url);
                    const linkClasses = `group ${rowClasses} transition-colors hover:bg-surface-muted`;
                    const arrow = (
                      <ArrowUpRight
                        className="size-4 shrink-0 text-fg-subtle transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                        aria-hidden="true"
                      />
                    );
                    return (
                      <li key={item.title}>
                        {external ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                            {label}
                            <span className="sr-only">(opens in a new tab)</span>
                            {arrow}
                          </a>
                        ) : (
                          <Link href={item.url} className={linkClasses}>
                            {label}
                            {arrow}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </aside>
        </Container>
      </section>

      {/* Featured projects */}
      <section aria-labelledby="projects-heading" className="py-20 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              id="projects-heading"
              eyebrow="01 / Work"
              title="Selected projects"
              description="End-to-end work across computer vision, model benchmarking, and LLM applications. Each project shows its real status."
              action={<ArrowLink href="/projects">View all projects</ArrowLink>}
            />
          </Reveal>
          {featured.length > 0 ? (
            <ProjectGrid projects={featured} />
          ) : projects.length > 0 ? (
            <ProjectGrid projects={projects.slice(0, 4)} />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Projects coming soon"
              description="Projects will appear here as they are published."
            />
          )}
        </Container>
      </section>

      {/* Skills overview */}
      {skillGroups.length > 0 && (
        <section aria-labelledby="skills-heading" className="border-t border-line py-20 sm:py-28">
          <Container>
            <Reveal>
              <SectionHeading
                id="skills-heading"
                eyebrow="02 / Stack"
                title="Skills & tools"
                description="The languages, frameworks, and tools I use most. The full list, grouped by area, is on the skills page."
                action={<ArrowLink href="/skills">View all skills</ArrowLink>}
              />
            </Reveal>
            <div className="card overflow-hidden rounded-2xl">
              <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
                {skillGroups.map((group, index) => (
                  <Reveal as="li" key={group.slug} delay={(index % 3) * 50} className="bg-surface p-6">
                    <h3 className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">{group.title}</h3>
                    <ul className="mt-4 space-y-2">
                      {group.skills.map((skill) => (
                        <li key={skill.name} className="flex items-center gap-2.5 text-[0.9375rem] text-fg">
                          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      )}

      {/* Experience (education has its own page) */}
      <section aria-labelledby="experience-heading" className="border-t border-line py-20 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              id="experience-heading"
              eyebrow="03 / Experience"
              title="Where I've worked"
              action={<ArrowLink href="/experience">Full timeline</ArrowLink>}
            />
          </Reveal>
          <Reveal>
            {experience.length > 0 ? (
              <ul className="card divide-y divide-line overflow-hidden rounded-2xl">
                {experience.map((item) => (
                  <li key={item.id} className="grid gap-1 px-5 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8 sm:px-7">
                    <p className="font-mono text-xs text-fg-subtle sm:pt-1.5">
                      {formatRange(item.start_date, item.end_date ?? undefined)}
                    </p>
                    <div>
                      <p className="font-display text-lg font-semibold">{item.role}</p>
                      <p className="text-sm text-fg-muted">
                        {item.organization} · {employmentTypeLabel[item.employment_type]}
                      </p>
                      {item.description && (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pretty text-fg-muted">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card rounded-2xl px-5 py-5 text-sm text-fg-muted">
                Professional experience will be added here.
              </p>
            )}
          </Reveal>
        </Container>
      </section>

      {/* Latest certifications */}
      {certifications.length > 0 && (
        <section aria-labelledby="certifications-heading" className="border-t border-line py-20 sm:py-28">
          <Container>
            <Reveal>
              <SectionHeading
                id="certifications-heading"
                eyebrow="04 / Credentials"
                title="Latest certifications"
                action={<ArrowLink href="/certifications">View all certifications</ArrowLink>}
              />
            </Reveal>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {certifications.map((cert, index) => (
                <Reveal
                  as="li"
                  key={cert.id}
                  delay={index * 60}
                  className="card card-hover flex items-start gap-4 rounded-2xl p-5"
                >
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-fg">{cert.name}</h3>
                    <p className="mt-0.5 text-sm text-fg-muted">{cert.issuer}</p>
                    <p className="mt-1 font-mono text-xs text-fg-subtle">Issued {formatMonth(cert.issue_date)}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
