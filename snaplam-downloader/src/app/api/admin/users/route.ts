import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { kickUser } from "@/lib/socket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/users?search= — list users for the ban/kick panel.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const items = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      totalDownloads: true,
      isBanned: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}

// PATCH /api/admin/users { userId, action: "ban" | "unban" | "kick" }
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });

  const { userId, action } = await req.json().catch(() => ({}));
  if (!userId || !action) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // Never allow banning an admin.
  if (user.role === "ADMIN") {
    return NextResponse.json({ ok: false, error: "Tidak bisa memban admin." }, { status: 400 });
  }

  if (action === "ban") {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
    if (user.email) kickUser(user.email);
  } else if (action === "unban") {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: false } });
  } else if (action === "kick") {
    if (user.email) kickUser(user.email);
  } else {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
