import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { emitBroadcast } from "@/lib/socket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/broadcast — history list.
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });
  const items = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ ok: true, items });
}

// POST /api/admin/broadcast { title, message, type } — send + persist.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || "").trim().slice(0, 120);
  const message = String(body?.message || "").trim().slice(0, 1000);
  const type = ["INFO", "UPDATE", "MAINTENANCE"].includes(body?.type)
    ? body.type
    : "INFO";

  if (!title || !message) {
    return NextResponse.json({ ok: false, error: "Judul & pesan wajib diisi." }, { status: 400 });
  }

  const bc = await prisma.broadcast.create({ data: { title, message, type } });

  // Push to all online users in real time.
  emitBroadcast({
    id: bc.id,
    title: bc.title,
    message: bc.message,
    type: bc.type,
    createdAt: bc.createdAt.toISOString(),
  });

  return NextResponse.json({ ok: true, broadcast: bc });
}
