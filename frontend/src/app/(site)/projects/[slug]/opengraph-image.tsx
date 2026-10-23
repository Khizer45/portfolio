import { getProfile, getProject } from "@/lib/content";
import { projectStatusMeta } from "@/lib/labels";
import { ogSize, renderOgImage } from "@/lib/og";

export const alt = "Project overview";
export const size = ogSize;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, project] = await Promise.all([getProfile(), getProject(slug)]);
  const owner = { name: profile.display_name, role: profile.role };
  if (!project) return renderOgImage({ ...owner, eyebrow: "Project", title: "Project not found" });
  return renderOgImage({
    ...owner,
    eyebrow: `Project · ${projectStatusMeta[project.status].label}`,
    title: project.title,
    subtitle: project.subtitle ?? project.summary,
  });
}
