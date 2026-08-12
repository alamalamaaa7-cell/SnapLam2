import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/request";
import { detectPlatform, isValidUrl } from "@/lib/platforms";
import { getSettings } from "@/lib/settings";
import { downloadQueue } from "@/lib/queue";
import { processDownload } from "@/lib/processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/download  { url, socketId }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Harus login dulu." }, { status: 401 });
  }
  if ((session.user as any).isBanned) {
    return NextResponse.json({ ok: false, error: "Akun kamu diblokir." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const body = await req.json().catch(() => ({}));
  const url = String(body?.url || "").trim();
  const socketId = body?.socketId ? String(body.socketId) : undefined;

  if (!isValidUrl(url)) {
    return NextResponse.json({ ok: false, error: "URL tidak valid." }, { status: 400 });
  }

  const platform = detectPlatform(url);
  if (platform === "unknown") {
    return NextResponse.json(
      { ok: false, error: "Platform tidak didukung." },
      { status: 400 }
    );
  }

  const settings = await getSettings();

  // Maintenance mode blocks non-admins.
  if (settings.maintenanceMode && (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Sedang maintenance. Coba lagi nanti." },
      { status: 503 }
    );
  }

  // Global per-IP rate limit: 30 requests / hour.
  const ipLimit = await rateLimit(`ip:${ip}:dl`, 30, 60 * 60);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak permintaan. Coba lagi nanti (maks 30/jam)." },
      { status: 429 }
    );
  }

  // Per-user daily limit (admin exempt).
  if ((session.user as any).role !== "ADMIN") {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const todayCount = await prisma.download.count({
      where: { userId: session.user.id, createdAt: { gte: since }, status: { not: "GAGAL" } },
    });
    if (todayCount >= settings.dailyLimit) {
      return NextResponse.json(
        { ok: false, error: `Limit harian tercapai (${settings.dailyLimit}/hari).` },
        { status: 429 }
      );
    }
  }

  // Create the pending download record.
  const record = await prisma.download.create({
    data: {
      userId: session.user.id,
      email: session.user.email,
      url,
      platform,
      status: "PROSES",
      ip,
    },
  });

  // Queue via BullMQ when Redis exists, else process inline.
  if (downloadQueue) {
    await downloadQueue.add(
      "download",
      { downloadId: record.id, url, socketId },
      { jobId: record.id }
    );
    return NextResponse.json({
      ok: true,
      queued: true,
      downloadId: record.id,
      platform,
    });
  }

  // Inline path (no queue). Kick off async — respond immediately with the id.
  processDownload({ downloadId: record.id, url, socketId }).catch(() => {});
  return NextResponse.json({
    ok: true,
    queued: false,
    downloadId: record.id,
    platform,
  });
}
