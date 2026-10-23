import { getProfile } from "@/lib/content";
import { ogSize, renderOgImage } from "@/lib/og";

export const alt = "Software Engineer portfolio";
export const size = ogSize;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image() {
  const profile = await getProfile();
  return renderOgImage({ name: profile.display_name, role: profile.role, eyebrow: "Portfolio", title: profile.headline });
}
