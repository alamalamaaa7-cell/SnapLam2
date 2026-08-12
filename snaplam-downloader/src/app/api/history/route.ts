import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/history — the current user's recent downloads (right sidebar).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const items = await prisma.download.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      url: true,
      platform: true,
      title: true,
      thumbnail: true,
      duration: true,
      format: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}

// DELETE /api/history — clear the user's history.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await prisma.download.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
