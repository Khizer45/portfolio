"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { api, errorMessage, revalidatePublicSite } from "@/features/admin/api";
import { useConfirm } from "@/features/admin/confirm";
import { ResourceForm } from "@/features/admin/form/resource-form";
import type { FormSection, FormValues } from "@/features/admin/form/types";
import { toFormValues } from "@/features/admin/form/validation";
import { useToast } from "@/features/admin/toast";
import { useApiData } from "@/features/admin/use-api";
import { AdminPageHeader, Card, ErrorState, Skeleton } from "@/features/admin/ui";
import { initials } from "@/lib/format";
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
      { name: "profile_image_url", label: "Profile image URL", type: "link", help: "Filled in automatically when you upload a photo above. You can also use a URL or a file in the frontend's public/ folder." },
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
        help: "Shown as icons in the footer and on the Contact page. For WhatsApp use https://wa.me/ followed by your number with the country code, e.g. https://wa.me/923001234567.",
        fields: [
          { name: "label", label: "Label", type: "text", required: true, maxLength: 40, placeholder: "WhatsApp" },
          { name: "url", label: "URL", type: "url", required: true },
        ],
      },
    ],
  },
  {
    title: "Navigation & footer",
    fields: [
      {
        name: "nav_links",
        label: "Extra menu links",
        type: "repeater",
        itemLabel: "Menu link",
        titleField: "label",
        maxItems: 6,
        help: "Added after the built-in pages in the header menu and the footer. Use a page on this site (e.g. /writing) or a full URL, which opens in a new tab.",
        fields: [
          { name: "label", label: "Label", type: "text", required: true, maxLength: 40, placeholder: "Blog" },
          { name: "url", label: "Link", type: "link", required: true, placeholder: "https://… or /page" },
        ],
      },
      { name: "footer_text", label: "Footer text", type: "textarea", rows: 2, maxLength: 300, wide: true, help: "Shown under your name in the footer. Leave empty to show your role line." },
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
        <>
          {profile && (
            <PhotoUploader
              profile={profile}
              onChange={(saved) => {
                setProfile(saved);
                setVersion((v) => v + 1);
              }}
            />
          )}
          <ResourceForm key={version} sections={SECTIONS} initialValues={initialValues} onSubmit={save} submitLabel="Save profile" />
        </>
      )}
    </div>
  );
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 1_500_000;

/** Upload or remove the portrait. It is stored by the backend, so it survives redeploys. */
function PhotoUploader({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function upload(file: File) {
    setProblem(null);
    if (!PHOTO_TYPES.includes(file.type)) return setProblem("Choose a JPG, PNG, or WebP image.");
    if (file.size > MAX_PHOTO_BYTES) return setProblem("The image is larger than 1.5 MB. Export a smaller version and try again.");
    setBusy(true);
    try {
      const saved = await api.put<Profile>("/admin/profile/photo", file);
      onChange(saved);
      toast.success("Photo updated.");
      revalidatePublicSite();
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Remove your photo?",
      message: "The public site will show your initials instead.",
      confirmLabel: "Remove photo",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      onChange(await api.delete<Profile>("/admin/profile/photo"));
      toast.success("Photo removed.");
      revalidatePublicSite();
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      {profile.profile_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.profile_image_url}
          alt="Current profile photo"
          width={96}
          height={96}
          className="size-24 shrink-0 rounded-xl border border-line bg-surface-muted object-cover object-top"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-24 shrink-0 place-items-center rounded-xl border border-line bg-surface-muted font-mono text-xl font-semibold text-fg-muted"
        >
          {initials(profile.display_name)}
        </span>
      )}
      <div className="min-w-0">
        <h2 className="font-semibold">Profile photo</h2>
        <p id="photo-help" className="mt-1 text-sm text-fg-muted">
          A real, recent photo. JPG, PNG, or WebP, up to 1.5 MB. A square image around 800 × 800 works best.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className={buttonClasses({ size: "sm", className: busy ? "pointer-events-none opacity-60" : "cursor-pointer" })}>
            <ImageUp aria-hidden="true" />
            {busy ? "Uploading…" : profile.profile_image_url ? "Replace photo" : "Upload photo"}
            <input
              ref={input}
              type="file"
              accept={PHOTO_TYPES.join(",")}
              className="sr-only"
              aria-describedby="photo-help"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>
          {profile.profile_image_url && (
            <button type="button" onClick={remove} disabled={busy} className={buttonClasses({ size: "sm", variant: "ghost" })}>
              <Trash2 aria-hidden="true" /> Remove
            </button>
          )}
        </div>
        {problem && (
          <p role="alert" className="mt-2 text-sm text-tone-amber">
            {problem}
          </p>
        )}
      </div>
    </Card>
  );
}
