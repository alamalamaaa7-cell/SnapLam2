import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SnapLam - Downloader v1.3",
    short_name: "SnapLam",
    description: "Download Semua Video & Ngobrol Santai",
    start_url: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#111827",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
