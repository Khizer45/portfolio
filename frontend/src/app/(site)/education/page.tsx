import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";

import { EducationList } from "@/components/education-list";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getEducation } from "@/lib/content";

export const metadata: Metadata = {
  title: "Education",
  description:
    "Education of Khizer Hayat: BS Software Engineering at Mirpur University of Science and Technology (MUST), with earlier HSSC and SSC qualifications.",
  alternates: { canonical: "/education" },
};

export const revalidate = 300;

export default async function EducationPage() {
  const education = await getEducation();

  return (
    <>
      <PageHeader
        eyebrow="Education"
        title="Education"
        description="Degree, institutions, and results, most recent first."
      />
      <Container className="py-12 sm:py-16">
        {education.length > 0 ? (
          <EducationList items={education} />
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="Education will be added here"
            description="Degrees and qualifications will appear here."
          />
        )}
      </Container>
    </>
  );
}
