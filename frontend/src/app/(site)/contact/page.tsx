import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { profileLinks, SocialLinks } from "@/components/layout/site-footer";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { getProfile } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Khizer Hayat about software engineering, AI engineering, and backend roles or freelance projects.",
  alternates: { canonical: "/contact" },
};

export const revalidate = 300;

export default async function ContactPage() {
  const profile = await getProfile();
  const email = profile.contact_email;
  const hasLinks = profileLinks(profile).length > 0;

  const description = [
    profile.availability_open && profile.availability_label ? `${profile.availability_label}.` : "",
    "Send a message below, or reach me on any of these.",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageHeader eyebrow="Contact" title="Get in touch" description={description} />
      <Container className="py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            {hasLinks && (
              <div>
                <h2 className="font-mono text-xs tracking-[0.1em] text-fg-subtle uppercase">Reach me on</h2>
                <SocialLinks profile={profile} size="lg" className="mt-4 flex flex-wrap items-center gap-3" />
              </div>
            )}
            {profile.location && (
              <p className={`flex items-center gap-2.5 text-fg-muted ${hasLinks ? "mt-10 border-t border-line pt-8" : ""}`}>
                <MapPin className="size-4 text-accent" aria-hidden="true" />
                Based in {profile.location}
              </p>
            )}
          </Reveal>

          {email && (
            <Reveal delay={80} className="card rounded-2xl p-6 sm:p-8 lg:col-span-7">
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
