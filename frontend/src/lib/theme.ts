/**
 * Site themes, chosen in Admin → Profile → Appearance.
 *
 * Each preset is a full set of colour tokens for light and dark mode. The root layout turns the
 * chosen preset (plus the optional accent / button colour overrides) into CSS variables, and
 * `globals.css` maps them to Tailwind colours. Custom colours are nudged lighter or darker until
 * they meet WCAG AA contrast against the preset's backgrounds, so any colour stays readable.
 */
import type { Profile } from "@/types/api";

export type ThemePreset = "blueprint" | "lime" | "ocean" | "graphite";
export type ThemeMode = "light" | "dark";
export type ThemePattern = "grid" | "dots" | "none";
export type ThemeCards = "offset" | "soft" | "flat";
export type ThemeCorners = "sharp" | "rounded";

export type ThemeSettings = {
  preset: ThemePreset;
  mode: ThemeMode;
  accent: string | null;
  button: string | null;
  pattern: ThemePattern;
  cards: ThemeCards;
  corners: ThemeCorners;
};

type Tokens = {
  bg: string;
  surface: string;
  "surface-muted": string;
  line: string;
  "line-strong": string;
  fg: string;
  "fg-muted": string;
  "fg-subtle": string;
  /** Text colour for eyebrows, links and highlights. */
  accent: string;
  /** Primary button fill and its text. */
  "accent-fill": string;
  "accent-fill-fg": string;
  /** Card borders and offset shadows in the "offset" card style. */
  ink: string;
  "footer-bg": string;
  "footer-fg": string;
  "footer-muted": string;
};

type Preset = { label: string; light: Tokens; dark: Tokens };

export const PRESETS: Record<ThemePreset, Preset> = {
  blueprint: {
    label: "Blueprint — paper, navy ink and vermilion",
    light: {
      bg: "#f4f2eb",
      surface: "#fffefa",
      "surface-muted": "#ebe8de",
      line: "#dcd8cb",
      "line-strong": "#b7b2a2",
      fg: "#131a35",
      "fg-muted": "#3d4463",
      "fg-subtle": "#585f7b",
      accent: "#b8341b",
      "accent-fill": "#1f2a55",
      "accent-fill-fg": "#ffffff",
      ink: "#1f2a55",
      "footer-bg": "#1f2a55",
      "footer-fg": "#f4f2eb",
      "footer-muted": "#c0c5dc",
    },
    dark: {
      bg: "#0c1124",
      surface: "#131a33",
      "surface-muted": "#1a2242",
      line: "#252e54",
      "line-strong": "#38426f",
      fg: "#eef0f8",
      "fg-muted": "#b5bad1",
      "fg-subtle": "#9198b4",
      accent: "#ff8466",
      "accent-fill": "#ff8466",
      "accent-fill-fg": "#170a05",
      ink: "#5d6bab",
      "footer-bg": "#070b19",
      "footer-fg": "#eef0f8",
      "footer-muted": "#a3a9c4",
    },
  },
  lime: {
    label: "Lime — charcoal and lime",
    light: {
      bg: "#f5f5f1",
      surface: "#ffffff",
      "surface-muted": "#ecece6",
      line: "#e0e0d8",
      "line-strong": "#c9c9bf",
      fg: "#111214",
      "fg-muted": "#4a4c52",
      "fg-subtle": "#62646a",
      accent: "#436f06",
      "accent-fill": "#c6f36b",
      "accent-fill-fg": "#0b0c0e",
      ink: "#111214",
      "footer-bg": "#111214",
      "footer-fg": "#f1f1ec",
      "footer-muted": "#b4b6bb",
    },
    dark: {
      bg: "#0b0c0e",
      surface: "#131417",
      "surface-muted": "#1a1b1f",
      line: "#232529",
      "line-strong": "#33363c",
      fg: "#f1f1ec",
      "fg-muted": "#a6a8ad",
      "fg-subtle": "#8a8d93",
      accent: "#c6f36b",
      "accent-fill": "#c6f36b",
      "accent-fill-fg": "#0b0c0e",
      ink: "#5c6069",
      "footer-bg": "#050506",
      "footer-fg": "#f1f1ec",
      "footer-muted": "#a6a8ad",
    },
  },
  ocean: {
    label: "Ocean — slate and teal",
    light: {
      bg: "#eef4f5",
      surface: "#ffffff",
      "surface-muted": "#e2ecee",
      line: "#d1dfe2",
      "line-strong": "#a9c0c5",
      fg: "#0b1e25",
      "fg-muted": "#33505a",
      "fg-subtle": "#4f6c75",
      accent: "#0a6f6a",
      "accent-fill": "#0f3b48",
      "accent-fill-fg": "#ffffff",
      ink: "#0f3b48",
      "footer-bg": "#0f3b48",
      "footer-fg": "#eef4f5",
      "footer-muted": "#b5cdd3",
    },
    dark: {
      bg: "#06141a",
      surface: "#0c1e25",
      "surface-muted": "#12282f",
      line: "#1a343c",
      "line-strong": "#29484f",
      fg: "#e5f2f3",
      "fg-muted": "#a6c0c5",
      "fg-subtle": "#86a2a8",
      accent: "#4fd1c5",
      "accent-fill": "#4fd1c5",
      "accent-fill-fg": "#03201d",
      ink: "#3f7682",
      "footer-bg": "#030b0e",
      "footer-fg": "#e5f2f3",
      "footer-muted": "#9cb7bc",
    },
  },
  graphite: {
    label: "Graphite — black, white and electric blue",
    light: {
      bg: "#f3f3f2",
      surface: "#ffffff",
      "surface-muted": "#e9e9e7",
      line: "#dadad7",
      "line-strong": "#b9b9b5",
      fg: "#111111",
      "fg-muted": "#424242",
      "fg-subtle": "#5e5e5e",
      accent: "#2445d4",
      "accent-fill": "#111111",
      "accent-fill-fg": "#ffffff",
      ink: "#111111",
      "footer-bg": "#111111",
      "footer-fg": "#f3f3f2",
      "footer-muted": "#bdbdbd",
    },
    dark: {
      bg: "#0b0b0c",
      surface: "#151517",
      "surface-muted": "#1c1c1f",
      line: "#26262a",
      "line-strong": "#3a3a40",
      fg: "#f2f2f2",
      "fg-muted": "#b0b0b5",
      "fg-subtle": "#8f8f96",
      accent: "#8fa3ff",
      "accent-fill": "#f2f2f2",
      "accent-fill-fg": "#111111",
      ink: "#6b6b75",
      "footer-bg": "#050505",
      "footer-fg": "#f2f2f2",
      "footer-muted": "#a8a8ae",
    },
  },
};

export const THEME_DEFAULTS: ThemeSettings = {
  preset: "blueprint",
  mode: "light",
  accent: null,
  button: null,
  pattern: "grid",
  cards: "offset",
  corners: "rounded",
};

const HEX = /^#[0-9a-f]{6}$/i;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** The theme stored on the profile, with anything unknown replaced by the default. */
export function themeFromProfile(profile: Partial<Profile>): ThemeSettings {
  const color = (value: unknown) => (typeof value === "string" && HEX.test(value) ? value.toLowerCase() : null);
  return {
    preset: pick(profile.theme_preset, Object.keys(PRESETS) as ThemePreset[], THEME_DEFAULTS.preset),
    mode: pick(profile.theme_mode, ["light", "dark"], THEME_DEFAULTS.mode),
    accent: color(profile.theme_accent),
    button: color(profile.theme_button),
    pattern: pick(profile.theme_pattern, ["grid", "dots", "none"], THEME_DEFAULTS.pattern),
    cards: pick(profile.theme_cards, ["offset", "soft", "flat"], THEME_DEFAULTS.cards),
    corners: pick(profile.theme_corners, ["sharp", "rounded"], THEME_DEFAULTS.corners),
  };
}

/* -------------------------------------------------------------------------- */
/* Colour maths                                                               */
/* -------------------------------------------------------------------------- */

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Blend `hex` towards `target` by `amount` (0–1). */
function mix(hex: string, target: string, amount: number): string {
  const a = toRgb(hex);
  const b = toRgb(target);
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount) as Rgb);
}

function rgba(hex: string, alpha: number): string {
  return `rgb(${toRgb(hex).join(" ")} / ${alpha})`;
}

/** Darken (or lighten) `hex` in small steps until it reaches `ratio` against every background. */
function readable(hex: string, backgrounds: string[], ratio: number, towards: string): string {
  let color = hex;
  for (let step = 1; step <= 20 && Math.min(...backgrounds.map((bg) => contrast(color, bg))) < ratio; step++) {
    color = mix(hex, towards, step * 0.05);
  }
  return color;
}

/** Black or white text, whichever reads better on `fill`; the fill is adjusted if neither reaches AA. */
function fillWithText(fill: string): { fill: string; text: string } {
  const dark = "#0b0c0e";
  const light = "#ffffff";
  const text = contrast(fill, dark) >= contrast(fill, light) ? dark : light;
  return { fill: readable(fill, [text], 4.5, text === dark ? light : dark), text };
}

/* -------------------------------------------------------------------------- */
/* CSS                                                                        */
/* -------------------------------------------------------------------------- */

function tokensFor(settings: ThemeSettings, mode: ThemeMode): Record<string, string> {
  const base = PRESETS[settings.preset][mode];
  const backgrounds = [base.bg, base.surface, base["surface-muted"]];
  const away = mode === "light" ? "#000000" : "#ffffff";

  const accent = settings.accent ? readable(settings.accent, backgrounds, 4.5, away) : base.accent;
  let fill = base["accent-fill"];
  let fillText = base["accent-fill-fg"];
  if (settings.button) {
    // The button must stand out from the page (3:1) and its label must be readable (4.5:1).
    const visible = readable(settings.button, [base.bg], 3, away);
    ({ fill, text: fillText } = fillWithText(visible));
  }
  const ink = settings.button && base.ink === base["accent-fill"] ? fill : base.ink;
  const toward = mode === "light" ? "#000000" : "#ffffff";

  return {
    ...base,
    accent,
    "accent-hover": mix(accent, toward, 0.15),
    "accent-fg": contrast(accent, "#ffffff") >= contrast(accent, "#0b0c0e") ? "#ffffff" : "#0b0c0e",
    "accent-soft": rgba(accent, mode === "light" ? 0.08 : 0.1),
    "accent-line": rgba(accent, 0.35),
    "accent-fill": fill,
    "accent-fill-hover": mix(fill, fillText === "#ffffff" ? "#000000" : "#ffffff", 0.12),
    "accent-fill-fg": fillText,
    ink,
    "footer-line": rgba(base["footer-fg"], 0.16),
    "grid-line": rgba(base.fg, mode === "light" ? 0.055 : 0.05),
    "grid-dot": rgba(base.fg, mode === "light" ? 0.16 : 0.14),
  };
}

function declarations(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([name, value]) => `--${name}:${value}`)
    .join(";");
}

/**
 * The theme's CSS variables. Every value is a preset constant or a colour computed from a
 * validated hex colour, so the result is safe to inline in a <style> tag. `html:root` and
 * `html.dark` outrank the fallbacks in globals.css whatever order the styles load in.
 */
export function themeCss(settings: ThemeSettings): string {
  return `html:root{${declarations(tokensFor(settings, "light"))}}html.dark{${declarations(tokensFor(settings, "dark"))}}`;
}

/** Browser UI colour (mobile address bar) for each mode. */
export function themeColors(settings: ThemeSettings): { light: string; dark: string } {
  return { light: PRESETS[settings.preset].light.bg, dark: PRESETS[settings.preset].dark.bg };
}
