import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { site } from "@/data/site";
import { getProfile } from "@/lib/content";
import { getSiteUrl } from "@/lib/site-url";
import { themeColors, themeCss, themeFromProfile } from "@/lib/theme";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Only used for small labels, so it isn't preloaded ahead of the text and heading fonts.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: site.title,
    template: `%s · ${site.ownerName}`,
  },
  description: site.description,
  applicationName: site.ownerName,
  authors: [{ name: site.ownerName }],
  creator: site.ownerName,
  keywords: [site.ownerName, "Software Engineer", "AI Engineer", "Machine Learning", "MLOps", "FastAPI", "Python", "Portfolio"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.ownerName,
    title: site.title,
    description: site.description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

async function getTheme() {
  return themeFromProfile(await getProfile());
}

export async function generateViewport(): Promise<Viewport> {
  const colors = themeColors(await getTheme());
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: colors.light },
      { media: "(prefers-color-scheme: dark)", color: colors.dark },
    ],
  };
}

// Runs before the first paint so the saved light/dark choice never flashes (without one, the
// default mode from Admin → Appearance applies). It also enables scroll reveals only when
// JavaScript runs and the visitor hasn't asked for reduced motion.
function themeScript(defaultMode: "light" | "dark") {
  return `(function(){try{var s=localStorage.getItem("theme");var t=s==="light"||s==="dark"?s:"${defaultMode}";document.documentElement.classList.toggle("dark",t==="dark");if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion-ok")}catch(e){}})();`;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-preset={theme.preset}
      data-pattern={theme.pattern}
      data-cards={theme.cards}
      data-corners={theme.corners}
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${theme.mode === "dark" ? "dark" : ""} h-full antialiased`}
    >
      <head>
        {/* Theme colours (validated hex values and preset constants only; see lib/theme.ts). */}
        <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript(theme.mode) }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-[60] rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
