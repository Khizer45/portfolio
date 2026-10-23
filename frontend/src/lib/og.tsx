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
          background: "#09090b",
          backgroundImage:
            "radial-gradient(ellipse 60% 70% at 15% 0%, rgba(125,149,255,0.16), transparent), linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
          color: "#ededf0",
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
              borderRadius: 16,
              border: "2px solid rgba(125,149,255,0.45)",
              background: "rgba(125,149,255,0.1)",
              color: "#7d95ff",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {initials(name)}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 22, color: "#a7a7b1" }}>{role}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 22, color: "#7d95ff", letterSpacing: 3, textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ fontSize: title.length > 60 ? 56 : 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 28, color: "#a7a7b1", lineHeight: 1.4 }}>{subtitle}</div>}
        </div>
      </div>
    ),
    ogSize,
  );
}
