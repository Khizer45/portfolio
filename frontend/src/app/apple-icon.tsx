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
          background: "#c6f36b",
          color: "#0b0c0e",
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
