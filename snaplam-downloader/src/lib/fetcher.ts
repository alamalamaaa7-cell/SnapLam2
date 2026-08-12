import { redis } from "./redis";
import {
  PlatformId,
  buildProviderUrl,
  detectPlatform,
} from "./platforms";

export interface DownloadLink {
  label: string; // e.g. "MP4 HD", "MP3", "Image"
  format: "MP4" | "MP3" | "IMAGE";
  url: string;
  quality?: string;
}

export interface MediaResult {
  ok: boolean;
  platform: PlatformId;
  title?: string;
  thumbnail?: string;
  duration?: string;
  author?: string;
  links: DownloadLink[];
  error?: string;
}

const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes per spec.

/**
 * Deeply walk an arbitrary provider JSON payload and pull out any
 * downloadable media URLs. Provider response shapes vary a lot, so we
 * parse defensively instead of assuming a fixed schema.
 */
function extractLinks(node: any, out: DownloadLink[], depth = 0) {
  if (!node || depth > 6) return;

  if (typeof node === "string") {
    const url = node.trim();
    if (/^https?:\/\//i.test(url)) {
      const lower = url.toLowerCase();
      if (/\.(mp4|mov|webm)(\?|$)/.test(lower) || /video|nowatermark|no_watermark|hdplay|play/.test(lower)) {
        out.push({ label: "Video MP4", format: "MP4", url });
      } else if (/\.(mp3|m4a|aac|ogg)(\?|$)/.test(lower) || /audio|music/.test(lower)) {
        out.push({ label: "Audio MP3", format: "MP3", url });
      } else if (/\.(jpg|jpeg|png|webp)(\?|$)/.test(lower)) {
        out.push({ label: "Image", format: "IMAGE", url });
      }
    }
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) extractLinks(item, out, depth + 1);
    return;
  }

  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const k = key.toLowerCase();
      // Common provider keys that directly hold URLs.
      if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        if (/(nowatermark|no_watermark|hdplay|hd_play|videourl|video_url|mp4|play)/.test(k)) {
          out.push({ label: labelFromKey(k, "MP4"), format: "MP4", url: value, quality: guessQuality(k) });
          continue;
        }
        if (/(music|audio|mp3|sound)/.test(k)) {
          out.push({ label: "Audio MP3", format: "MP3", url: value });
          continue;
        }
        if (/(image|thumb|cover|photo|jpg|png)/.test(k) && /image/.test(k)) {
          out.push({ label: "Image", format: "IMAGE", url: value });
          continue;
        }
      }
      extractLinks(value, out, depth + 1);
    }
  }
}

function labelFromKey(key: string, fallback: string) {
  if (key.includes("nowatermark") || key.includes("no_watermark")) return "MP4 No Watermark";
  if (key.includes("hd")) return "MP4 HD";
  if (key.includes("watermark")) return "MP4 (Watermark)";
  return `Video ${fallback}`;
}

function guessQuality(key: string) {
  if (key.includes("hd") || key.includes("1080")) return "HD";
  if (key.includes("sd") || key.includes("480")) return "SD";
  return undefined;
}

function pickString(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const found = deepFind(obj, k);
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return undefined;
}

function deepFind(node: any, targetKey: string, depth = 0): any {
  if (!node || depth > 6 || typeof node !== "object") return undefined;
  for (const [key, value] of Object.entries(node)) {
    if (key.toLowerCase() === targetKey.toLowerCase()) return value;
  }
  for (const value of Object.values(node)) {
    const found = deepFind(value, targetKey, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function dedupeLinks(links: DownloadLink[]): DownloadLink[] {
  const seen = new Set<string>();
  const result: DownloadLink[] = [];
  for (const l of links) {
    if (seen.has(l.url)) continue;
    seen.add(l.url);
    result.push(l);
  }
  return result;
}

/**
 * Fetch media metadata + download links from the external provider.
 * Cached in Redis for 30 minutes when available.
 */
export async function fetchMedia(rawUrl: string): Promise<MediaResult> {
  const target = rawUrl.trim();
  const platform = detectPlatform(target);

  if (platform === "unknown") {
    return {
      ok: false,
      platform,
      links: [],
      error: "Platform tidak dikenali. Pastikan link dari platform yang didukung.",
    };
  }

  const cacheKey = `media:${platform}:${target}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as MediaResult;
    } catch {
      /* ignore cache errors */
    }
  }

  const providerUrl = buildProviderUrl(platform, target);
  if (!providerUrl) {
    return { ok: false, platform, links: [], error: "Endpoint provider tidak tersedia untuk platform ini." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const res = await fetch(providerUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "SnapLam/1.3 (+https://snaplam.app)", Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        ok: false,
        platform,
        links: [],
        error: res.status === 404 ? "Video Tidak Ditemukan" : `Provider error (${res.status}).`,
      };
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, platform, links: [], error: "Respons provider tidak valid." };
    }

    // Some providers flag private/unavailable content.
    const statusFlag = pickString(data, ["status", "message", "error"]);
    if (statusFlag && /private|login|not\s*found|unavailable|invalid/i.test(statusFlag)) {
      const isPrivate = /private|login/i.test(statusFlag);
      return {
        ok: false,
        platform,
        links: [],
        error: isPrivate ? "Link Private / butuh login." : "Video Tidak Ditemukan",
      };
    }

    const links: DownloadLink[] = [];
    extractLinks(data.result ?? data.data ?? data, links);

    const result: MediaResult = {
      ok: links.length > 0,
      platform,
      title:
        pickString(data, ["title", "desc", "description", "caption", "name"]) ??
        `${platform} media`,
      thumbnail: pickString(data, ["thumbnail", "thumb", "cover", "image", "avatar"]),
      duration: pickString(data, ["duration", "durasi", "length"]),
      author: pickString(data, ["author", "nickname", "username", "artist", "channel"]),
      links: dedupeLinks(links),
      error: links.length ? undefined : "Video Tidak Ditemukan / tidak ada tautan unduhan.",
    };

    if (redis && result.ok) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
      } catch {
        /* ignore */
      }
    }

    return result;
  } catch (err: any) {
    const aborted = err?.name === "AbortError";
    return {
      ok: false,
      platform,
      links: [],
      error: aborted ? "Waktu tunggu habis. Coba lagi." : "Gagal menghubungi provider.",
    };
  }
}
