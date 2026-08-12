// Platform detection + provider endpoint mapping for SnapLam.
// External provider base: https://api.ikyyxd.my.id

export type PlatformId =
  | "tiktok"
  | "youtube"
  | "instagram"
  | "capcut"
  | "facebook"
  | "pinterest"
  | "snackvideo"
  | "spotify"
  | "terabox"
  | "unknown";

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  color: string; // tailwind gradient-ish accent
  formats: Array<"MP4" | "MP3" | "IMAGE">;
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  tiktok: { id: "tiktok", label: "TikTok", color: "from-pink-500 to-cyan-400", formats: ["MP4", "MP3"] },
  youtube: { id: "youtube", label: "YouTube", color: "from-red-500 to-rose-600", formats: ["MP4", "MP3"] },
  instagram: { id: "instagram", label: "Instagram", color: "from-fuchsia-500 to-amber-500", formats: ["MP4", "IMAGE"] },
  capcut: { id: "capcut", label: "CapCut", color: "from-slate-700 to-slate-900", formats: ["MP4"] },
  facebook: { id: "facebook", label: "Facebook", color: "from-blue-600 to-blue-800", formats: ["MP4"] },
  pinterest: { id: "pinterest", label: "Pinterest", color: "from-red-600 to-rose-700", formats: ["MP4", "IMAGE"] },
  snackvideo: { id: "snackvideo", label: "SnackVideo", color: "from-yellow-400 to-orange-500", formats: ["MP4"] },
  spotify: { id: "spotify", label: "Spotify", color: "from-green-500 to-emerald-600", formats: ["MP3"] },
  terabox: { id: "terabox", label: "Terabox", color: "from-sky-500 to-indigo-600", formats: ["MP4"] },
  unknown: { id: "unknown", label: "Unknown", color: "from-gray-500 to-gray-700", formats: ["MP4"] },
};

// Ordered list of host-matchers → platform.
const MATCHERS: Array<{ id: PlatformId; test: RegExp }> = [
  { id: "tiktok", test: /(^|\.)tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|douyin\.com/i },
  { id: "youtube", test: /(^|\.)youtube\.com|youtu\.be/i },
  { id: "instagram", test: /(^|\.)instagram\.com|instagr\.am/i },
  { id: "capcut", test: /(^|\.)capcut\.com/i },
  { id: "facebook", test: /(^|\.)facebook\.com|fb\.watch|(^|\.)fb\.com/i },
  { id: "pinterest", test: /(^|\.)pinterest\.[a-z.]+|pin\.it/i },
  { id: "snackvideo", test: /(^|\.)snackvideo\.com|sck\.io/i },
  { id: "spotify", test: /(^|\.)spotify\.com|spotify\.link/i },
  { id: "terabox", test: /(^|\.)terabox\.com|1024tera\.com|teraboxapp\.com/i },
];

export function detectPlatform(rawUrl: string): PlatformId {
  const url = (rawUrl || "").trim();
  for (const m of MATCHERS) {
    if (m.test.test(url)) return m.id;
  }
  return "unknown";
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const PROVIDER_BASE = "https://api.ikyyxd.my.id/download";

// Map a platform to its provider request URL.
// Some endpoints use ?url= and YouTube uses ?q=.
export function buildProviderUrl(platform: PlatformId, target: string): string | null {
  const q = encodeURIComponent(target.trim());
  switch (platform) {
    case "tiktok":
      return `${PROVIDER_BASE}/tiktokv3?url=${q}`;
    case "instagram":
      return `${PROVIDER_BASE}/igv2?url=${q}`;
    case "youtube":
      return `${PROVIDER_BASE}/ytmp4?q=${q}`;
    case "capcut":
      return `${PROVIDER_BASE}/capcut?url=${q}`;
    case "facebook":
      return `${PROVIDER_BASE}/facebook?url=${q}`;
    case "spotify":
      return `${PROVIDER_BASE}/spotifydl?url=${q}`;
    case "terabox":
      return `${PROVIDER_BASE}/terabox?url=${q}`;
    // Endpoints not explicitly documented — try a best-effort slug.
    case "pinterest":
      return `${PROVIDER_BASE}/pinterest?url=${q}`;
    case "snackvideo":
      return `${PROVIDER_BASE}/snackvideo?url=${q}`;
    default:
      return null;
  }
}
