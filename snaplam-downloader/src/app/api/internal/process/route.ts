import { NextRequest, NextResponse } from "next/server";
import { processDownload } from "@/lib/processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Internal-only endpoint invoked by the BullMQ worker (same process).
// Protected by a per-boot random token injected via env.
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-worker-token");
  if (!token || token !== process.env.INTERNAL_WORKER_TOKEN) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { downloadId, url, socketId } = await req.json().catch(() => ({}));
  if (!downloadId || !url) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const result = await processDownload({ downloadId, url, socketId });
  return NextResponse.json(result);
}
