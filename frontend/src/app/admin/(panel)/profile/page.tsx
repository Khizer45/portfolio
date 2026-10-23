"use client";

import { useMemo, useState } from "react";

import { api, errorMessage, revalidatePublicSite } from "@/features/admin/api";
import { ResourceForm } from "@/features/admin/form/resource-form";
import type { FormSection, FormValues } from "@/features/admin/form/types";
import { toFormValues } from "@/features/admin/form/validation";
import { useToast } from "@/features/admin/toast";
import { useApiData } from "@/features/admin/use-api";
import { AdminPageHeader, ErrorState, Skeleton } from "@/features/admin/ui";
import type { Profile } from "@/types/api";

const SECTIONS: FormSection[] = [
  {
    title: "Identity",
    fields: [
      { name: "display_name", label: "Display name", type: "text", required: true, maxLength: 100 },
      { name: "role", label: "Role line", type: "text", maxLength: 150, placeholder: "Software Engineer · AI/ML · MLOps" },
      { name: "headline", label: "Headline", type: "textarea", required: true, rows: 2, maxLength: 200, help: "The large text on the home page." },
      { name: "intro", label: "Introduction", type: "textarea", rows: 3, maxLength: 600, help: "One or two sentences under the headline." },
      { name: "biography", label: "Biography", type: "textarea", rows: 8, maxLength: 10000, help: "Shown on the About page. Separate paragraphs with a blank line." },
      { name: "location", label: "Location", type: "text", maxLength: 120 },
      { name: "profile_image_url", label: "Profile image URL", type: "link", help: "Optional. A URL or a file in the frontend's public/ folder. Use a real photo or leave empty." },
    ],
  },
  {
    title: "Contact & links",
    fields: [
      { name: "contact_email", label: "Contact email", type: "email", help: "Leave empty to hide every email link." },
      { name: "cv_url", label: "CV URL", type: "link", help: "A PDF in the frontend's public/cv/ folder (e.g. /cv/Khizer-Hayat-CV.pdf) or an external link." },
      { name: "github_url", label: "GitHub", type: "url" },
      { name: "linkedin_url", label: "LinkedIn", type: "url" },
      {
        name: "social_links",
        label: "Other profiles",
        type: "repeater",
        itemLabel: "Link",
        titleField: "label",
        maxItems: 12,
        fields: [
          { name: "label", label: "Label", type: "text", required: true, maxLength: 40, placeholder: "Kaggle" },
          { name: "url", label: "URL", type: "url", required: true },
        ],
      },
    ],
  },
  {
    title: "Availability",
    fields: [
      { name: "availability_open", label: "Show the availability badge", type: "checkbox", wide: true },
      { name: "availability_label", label: "Availability text", type: "text", maxLength: 150, wide: true, placeholder: "Open to entry-level software and AI engineering roles" },
    ],
  },
  {
    title: "About page",
    fields: [
      { name: "focus_areas", label: "Focus areas", type: "tags", help: "Shown in the home page \"At a glance\" panel." },
      { name: "career_interests", label: "Roles I'm pursuing", type: "tags" },
      { name: "spoken_languages", label: "Spoken languages", type: "tags" },
      { name: "interests", label: "What I'm interested in", type: "lines" },
      { name: "approach", label: "How I work", type: "lines" },
      { name: "seeking", label: "What I'm looking for", type: "lines" },
    ],
  },
];

export default function ProfilePage() {
  const toast = useToast();
  const { data: profile, error, loading, reload, setData: setProfile } = useApiData<Profile | null>("/admin/profile");
  const [version, setVersion] = useState(0);

  const initialValues = useMemo(
    () => toFormValues(SECTIONS, (profile ?? { availability_open: true }) as FormValues),
    [profile],
  );

  async function save(payload: FormValues) {
    const saved = await api.put<Profile>("/admin/profile", payload);
    setProfile(saved);
    setVersion((v) => v + 1);
    toast.success("Profile saved.");
    revalidatePublicSite();
  }

  return (
    <div>
      <AdminPageHeader title="Profile" description="Your name, headline, biography, links, and CV — used across the whole site." />
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : loading ? (
        <Skeleton rows={8} />
      ) : (
        <ResourceForm key={version} sections={SECTIONS} initialValues={initialValues} onSubmit={save} submitLabel="Save profile" />
      )}
    </div>
  );
}
