import { ArrowRight, ArrowUpRight, BadgeCheck, FolderOpen, GraduationCap, Mail, MapPin } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { CvButton } from "@/components/cv-button";
import { PersonJsonLd } from "@/components/person-json-ld";
import { ProjectGrid } from "@/components/projects/project-card";
import { ArrowLink } from "@/components/ui/arrow-link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import {
  cvLink,
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

const socialClasses =
  "grid size-10 place-items-center rounded-lg border border-line text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg";

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
  const technologyCount = new Set(projects.flatMap((p) => p.technologies)).size;
  const stats = [
    { label: "Projects", value: projects.length },
    { label: "Technologies", value: technologyCount },
  ].filter((stat) => stat.value > 0);
  const glanceFooter = [profile.location, profile.spoken_languages.join(", ")].filter(Boolean).join(" · ");

  return (
    <>
      <PersonJsonLd profile={profile} education={education} />

      {/* Hero */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="bg-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_55%_at_20%_10%,black,transparent)]"
        />
        <Container className="relative grid gap-12 pt-14 pb-16 sm:pt-20 sm:pb-24 lg:grid-cols-12 lg:gap-10 lg:pt-24">
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
            {profile.role && (
              <p
                className="animate-enter mt-10 font-mono text-sm tracking-[0.08em] text-accent uppercase"
                style={delay(60)}
              >
                {profile.role}
              </p>
            )}
            <h1
              id="hero-heading"
              className="animate-enter mt-4 text-[3.25rem] leading-[0.95] font-semibold tracking-[-0.04em] sm:text-7xl lg:text-[5.25rem]"
              style={delay(120)}
            >
              {profile.display_name}
            </h1>
            <p
              className="animate-enter mt-7 max-w-2xl text-xl leading-snug text-balance text-fg sm:text-2xl"
              style={delay(180)}
            >
              {profile.headline}
            </p>
            {profile.intro && (
              <p className="animate-enter mt-5 max-w-xl leading-relaxed text-pretty text-fg-muted" style={delay(220)}>
                {profile.intro}
              </p>
            )}
            <div className="animate-enter mt-9 flex flex-wrap gap-3" style={delay(260)}>
              <ButtonLink href="/projects">
                View projects
                <ArrowRight aria-hidden="true" className="group-hover/button:translate-x-0.5" />
              </ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Contact me
              </ButtonLink>
              <CvButton url={cvLink(profile)} name={profile.display_name} />
            </div>
            <ul className="animate-enter mt-9 flex items-center gap-2" style={delay(300)} aria-label="Profiles">
              {profile.github_url && (
                <li>
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className={socialClasses}>
                    <GitHubIcon className="size-[1.125rem]" />
                    <span className="sr-only">GitHub (opens in a new tab)</span>
                  </a>
                </li>
              )}
              {profile.linkedin_url && (
                <li>
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className={socialClasses}>
                    <LinkedInIcon className="size-[1.125rem]" />
                    <span className="sr-only">LinkedIn (opens in a new tab)</span>
                  </a>
                </li>
              )}
              {profile.contact_email && (
                <li>
                  <a href={`mailto:${profile.contact_email}`} className={socialClasses}>
                    <Mail className="size-[1.125rem]" aria-hidden="true" />
                    <span className="sr-only">Email {profile.contact_email}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* At a glance: bento tiles built only from real profile data */}
          <aside aria-labelledby="glance-heading" className="lg:col-span-5 lg:pt-10">
            <h2 id="glance-heading" className="sr-only">
              At a glance
            </h2>
            <div className="grid grid-cols-2 gap-3">
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
              {glanceFooter && (
                <p
                  className={`${tileClasses} animate-enter col-span-2 flex items-center gap-2 text-sm text-fg-muted`}
                  style={delay(360)}
                >
                  <MapPin className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  {glanceFooter}
                </p>
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
                description="The languages, frameworks, and tools I use most. Proficiency levels are on the skills page."
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
                    <ArrowLink href="/about#education" className="mt-4">
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

      {/* Contact */}
      <section aria-labelledby="contact-heading" className="border-t border-line py-20 sm:py-28">
        <Container>
          <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="font-mono text-xs tracking-[0.12em] text-accent uppercase">05 — Contact</p>
              <h2
                id="contact-heading"
                className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl"
              >
                Have a role or project in mind?
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-fg-muted">
                I&apos;m open to entry-level roles, internships, and freelance projects in software, AI, and backend
                engineering.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact">
                Send a message <ArrowRight aria-hidden="true" className="group-hover/button:translate-x-0.5" />
              </ButtonLink>
              {profile.contact_email && <CopyButton value={profile.contact_email} label="Copy email" size="md" />}
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
