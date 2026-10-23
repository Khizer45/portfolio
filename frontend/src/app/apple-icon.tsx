import { ImageResponse } from "next/og";

import { getProfile } from "@/lib/content";
import { initials } from "@/lib/format";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export const revalidate = 300;

export default async function AppleIcon() {
  const profile = await getProfile();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#7d95ff",
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -2,
        }}
      >
        {initials(profile.display_name)}
      </div>
    ),
    size,
  );
}
