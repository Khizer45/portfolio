import { ArrowRight, ArrowUpRight, BadgeCheck, FolderOpen, GraduationCap, MapPin } from "lucide-react";
import Link from "next/link";

import { PersonJsonLd } from "@/components/person-json-ld";
import { ProjectGrid } from "@/components/projects/project-card";
import { ArrowLink } from "@/components/ui/arrow-link";
import { Tag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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

const tileClasses = "rounded-2xl border border-line bg-surface p-5";
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
  const building = projects.filter((p) => p.status === "in_progress");
  const experience = allExperience.slice(0, 2);
  const certifications = allCertifications.slice(0, 3);
  const technologyUse = new Map<string, number>();
  for (const tech of projects.flatMap((p) => p.technologies)) technologyUse.set(tech, (technologyUse.get(tech) ?? 0) + 1);
  const technologyCount = technologyUse.size;
  // Ordered by how many published projects use each technology; ties keep project order.
  const topTechnologies = [...technologyUse.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tech]) => tech);
  const stats = [
    { label: "Projects", value: projects.length },
    { label: "Technologies", value: technologyCount },
  ].filter((stat) => stat.value > 0);
  const glanceFooter = [profile.location, profile.spoken_languages.join(", ")].filter(Boolean).join(" · ");
  // "Software Engineer · AI/ML Engineer" → separate items, so a long role wraps between titles, not inside one.
  const roles = profile.role.split(/\s*[·•|]\s*/).filter(Boolean);

  return (
    <>
      <PersonJsonLd profile={profile} education={education} />

      {/* Hero */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="bg-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_55%_at_20%_10%,black,transparent)]"
        />
        <Container className="relative grid gap-10 pt-10 pb-14 sm:gap-12 sm:pt-20 sm:pb-24 lg:grid-cols-12 lg:gap-10 lg:pt-24">
          <div className="lg:col-span-7">
            {profile.availability_open && profile.availability_label && (
              <p className="animate-enter inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted">
                <span aria-hidden="true" className="relative flex size-2">
                  <span className="animate-ping-soft absolute inset-0 rounded-full bg-accent-fill" />
                  <span className="relative size-2 rounded-full bg-accent-fill" />
                </span>
                {profile.availability_label}
              </p>
            )}
            {roles.length > 0 && (
              <ul
                aria-label="Roles"
                className="animate-enter mt-7 flex flex-wrap gap-2 font-mono text-[0.6875rem] tracking-[0.08em] text-accent uppercase sm:mt-10 sm:text-xs"
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

          {/* At a glance: bento tiles built only from real profile data */}
          <aside aria-labelledby="glance-heading" className="lg:col-span-5 lg:pt-10">
            <h2 id="glance-heading" className="sr-only">
              At a glance
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(profile.profile_image_url || glanceFooter) && (
                <div className={`${tileClasses} animate-enter col-span-2 flex items-center gap-5`} style={delay(140)}>
                  {profile.profile_image_url && (
                    // Set in Admin → Profile; it may be on any host, so next/image is not used.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.profile_image_url}
                      alt={`Portrait of ${profile.display_name}`}
                      width={96}
                      height={96}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="size-20 shrink-0 rounded-xl border border-line bg-surface-muted object-cover object-top sm:size-24"
                    />
                  )}
                  <div className="min-w-0 space-y-1.5 text-sm text-fg-muted">
                    {profile.location && (
                      <p className="flex items-center gap-2">
                        <MapPin className="size-4 shrink-0 text-accent" aria-hidden="true" />
                        {profile.location}
                      </p>
                    )}
                    {profile.spoken_languages.length > 0 && (
                      <p className="pl-6">{profile.spoken_languages.join(", ")}</p>
                    )}
                  </div>
                </div>
              )}
              {education && (
                <div className={`${tileClasses} animate-enter col-span-2`} style={delay(180)}>
                  <p className={tileLabelClasses}>
                    <GraduationCap className="size-3.5" aria-hidden="true" /> Education
                  </p>
                  <p className="mt-3 font-display text-lg font-semibold">{education.qualification}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{education.institution}</p>
                  <p className="mt-2 font-mono text-xs text-fg-subtle">
                    {education.start_date.slice(0, 4)}–{education.end_date ? education.end_date.slice(0, 4) : "Present"}
                    {education.grade && ` · ${education.grade}`}
                  </p>
                </div>
              )}
              {stats.map((stat, index) => (
                <div key={stat.label} className={`${tileClasses} animate-enter`} style={delay(240 + index * 40)}>
                  <p className={tileLabelClasses}>{stat.label}</p>
                  <p className="mt-3 font-display text-4xl font-semibold tracking-tight">{stat.value}</p>
                </div>
              ))}
              {building.length > 0 && (
                <div className={`${tileClasses} animate-enter col-span-2`} style={delay(320)}>
                  <p className={tileLabelClasses}>Currently building</p>
                  <ul className="mt-3 space-y-0.5">
                    {building.map((project) => (
                      <li key={project.slug}>
                        <Link
                          href={`/projects/${project.slug}`}
                          className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted"
                        >
                          <span className="min-w-0 truncate text-sm">
                            <span className="font-medium text-fg">{project.title}</span>
                            {project.subtitle && <span className="text-fg-subtle"> — {project.subtitle}</span>}
                          </span>
                          <ArrowUpRight
                            className="size-4 shrink-0 text-fg-subtle transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </Container>
      </section>

      {/* Featured projects */}
      <section aria-labelledby="projects-heading" className="py-20 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              id="projects-heading"
              eyebrow="01 — Work"
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
                eyebrow="02 — Stack"
                title="Skills & tools"
                description="The languages, frameworks, and tools I use most. The full list, grouped by area, is on the skills page."
                action={<ArrowLink href="/skills">View all skills</ArrowLink>}
              />
            </Reveal>
            <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
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
          </Container>
        </section>
      )}

      {/* Experience & education */}
      <section aria-labelledby="background-heading" className="border-t border-line py-20 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              id="background-heading"
              eyebrow="03 — Background"
              title="Experience & education"
              action={<ArrowLink href="/experience">Full timeline</ArrowLink>}
            />
          </Reveal>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <h3 className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">Experience</h3>
              {experience.length > 0 ? (
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {experience.map((item) => (
                    <li key={item.id} className="grid gap-1 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                      <p className="font-mono text-xs text-fg-subtle sm:pt-1">
                        {formatRange(item.start_date, item.end_date ?? undefined)}
                      </p>
                      <div>
                        <p className="font-display text-lg font-semibold">{item.role}</p>
                        <p className="text-sm text-fg-muted">
                          {item.organization} · {employmentTypeLabel[item.employment_type]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-y border-line py-5 text-sm text-fg-muted">
                  Professional experience will be added here.
                </p>
              )}
            </Reveal>
            {education && (
              <Reveal delay={80}>
                <h3 className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">Education</h3>
                <div className="mt-4 grid gap-1 border-y border-line py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <p className="font-mono text-xs text-fg-subtle sm:pt-1">
                    {formatRange(education.start_date, education.end_date ?? undefined)}
                  </p>
                  <div>
                    <p className="font-display text-lg font-semibold">{education.qualification}</p>
                    <p className="text-sm text-fg-muted">
                      {education.institution}
                      {education.grade && ` · ${education.grade}`}
                    </p>
                    {education.highlights.map((highlight) => (
                      <p key={highlight} className="mt-2 text-sm text-fg-muted">
                        {highlight}
                      </p>
                    ))}
                    <ArrowLink href="/education" className="mt-4">
                      Education details
                    </ArrowLink>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </Container>
      </section>

      {/* Latest certifications */}
      {certifications.length > 0 && (
        <section aria-labelledby="certifications-heading" className="border-t border-line py-20 sm:py-28">
          <Container>
            <Reveal>
              <SectionHeading
                id="certifications-heading"
                eyebrow="04 — Credentials"
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
                  className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
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
