import { ImageResponse } from "next/og";

import { initials } from "@/lib/format";

export const ogSize = { width: 1200, height: 630 };

/** Shared social-preview card used by the site and project Open Graph images. */
export function renderOgImage({
  name,
  role,
  eyebrow,
  title,
  subtitle,
}: {
  name: string;
  role: string;
  eyebrow: string;
  title: string;
  subtitle?: string | null;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0b0c0e",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
          color: "#f1f1ec",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#c6f36b",
              color: "#0b0c0e",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {initials(name)}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 22, color: "#a6a8ad" }}>{role}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 22, color: "#c6f36b", letterSpacing: 3, textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ fontSize: title.length > 60 ? 56 : 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 28, color: "#a6a8ad", lineHeight: 1.4 }}>{subtitle}</div>}
        </div>
      </div>
    ),
    ogSize,
  );
}
