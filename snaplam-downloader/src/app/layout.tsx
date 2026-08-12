import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/settings";

const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// The shell reads live settings (active theme), so render on demand.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SnapLam - Downloader v1.3",
    template: "%s · SnapLam",
  },
  description:
    "Download Semua Video & Ngobrol Santai. Downloader multi-platform: TikTok, YouTube, Instagram, CapCut, Facebook, Pinterest, SnackVideo, Spotify, Terabox.",
  keywords: [
    "downloader", "tiktok downloader", "youtube downloader", "instagram downloader",
    "video downloader", "spotify downloader", "terabox", "snaplam",
  ],
  authors: [{ name: "SnapLam" }],
  openGraph: {
    title: "SnapLam - Downloader v1.3",
    description: "Download Semua Video & Ngobrol Santai.",
    url: SITE_URL,
    siteName: "SnapLam",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapLam - Downloader v1.3",
    description: "Download Semua Video & Ngobrol Santai.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the active theme server-side so the first paint matches (no flash).
  const settings = await getSettings().catch(() => ({ theme: "abu" }) as any);

  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body>
        <Providers initialTheme={settings.theme}>{children}</Providers>
      </body>
    </html>
  );
}
