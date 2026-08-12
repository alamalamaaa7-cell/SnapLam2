import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/stats — Overview tab: cards, 30-day chart, per-platform pie.
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });

  const since = new Date();
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const [totalUsers, totalDownloads, success, failed, recent] = await Promise.all([
    prisma.user.count(),
    prisma.download.count(),
    prisma.download.count({ where: { status: "SUKSES" } }),
    prisma.download.count({ where: { status: "GAGAL" } }),
    prisma.download.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, platform: true, status: true },
    }),
  ]);

  // Build 30-day daily series.
  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const platformMap = new Map<string, number>();
  for (const r of recent) {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
    platformMap.set(r.platform, (platformMap.get(r.platform) || 0) + 1);
  }

  const daily = [...dayMap.entries()].map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    count,
  }));
  const byPlatform = [...platformMap.entries()].map(([name, value]) => ({ name, value }));

  return NextResponse.json({
    ok: true,
    cards: { totalUsers, totalDownloads, success, failed },
    daily,
    byPlatform,
  });
}
