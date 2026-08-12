import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/chat/messages — last 200 messages (chronological) for initial load.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rows = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      content: true,
      pinned: true,
      deleted: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, items: rows.reverse() });
}
