import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/request";
import { detectPlatform, isValidUrl } from "@/lib/platforms";
import { fetchMedia } from "@/lib/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/preview?url=...  — fetch metadata + links without recording a
// download (used to instantly show thumbnail/title/format buttons).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Harus login dulu." }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url")?.trim() || "";
  if (!isValidUrl(url)) {
    return NextResponse.json({ ok: false, error: "URL tidak valid." }, { status: 400 });
  }
  if (detectPlatform(url) === "unknown") {
    return NextResponse.json({ ok: false, error: "Platform tidak didukung." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const limit = await rateLimit(`ip:${ip}:preview`, 30, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak permintaan (maks 30/jam)." },
      { status: 429 }
    );
  }

  const media = await fetchMedia(url);
  return NextResponse.json(media, { status: media.ok ? 200 : 422 });
}
