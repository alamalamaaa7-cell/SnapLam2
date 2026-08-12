import { NextResponse } from "next/server";
import { auth, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me — bootstrap payload for the client shell:
// user profile, role, active theme, maintenance flag, unread broadcasts.
export async function GET() {
  const session = await auth();
  const settings = await getSettings();

  if (!session?.user?.id) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      settings,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

  // Unread broadcasts (seen popup on login).
  let unread: any[] = [];
  if (user) {
    const reads = await prisma.broadcastRead.findMany({
      where: { userId: user.id },
      select: { broadcastId: true },
    });
    const readIds = new Set(reads.map((r) => r.broadcastId));
    const recent = await prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    unread = recent.filter((b) => !readIds.has(b.id));
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      ...user,
      isAdmin: user?.role === "ADMIN" || isAdminEmail(user?.email),
    },
    settings,
    unread,
  });
}

// POST /api/me/read-broadcast { id } — mark a broadcast as read.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.broadcastRead
    .upsert({
      where: { broadcastId_userId: { broadcastId: id, userId: session.user.id } },
      update: {},
      create: { broadcastId: id, userId: session.user.id },
    })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
