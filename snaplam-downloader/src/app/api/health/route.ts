import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Railway healthcheck endpoint. Returns 200 quickly; reports subsystem status.
export async function GET() {
  const started = Date.now();
  let db = false;
  try {
    // Cheap round-trip to confirm Mongo connectivity.
    await prisma.$runCommandRaw({ ping: 1 });
    db = true;
  } catch {
    db = false;
  }

  return NextResponse.json(
    {
      status: "ok",
      app: "SnapLam - Downloader",
      version: "1.3.0",
      uptime: process.uptime(),
      db,
      redis: hasRedis,
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      latencyMs: Date.now() - started,
      time: new Date().toISOString(),
    },
    { status: 200 }
  );
}
