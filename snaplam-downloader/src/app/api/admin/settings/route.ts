import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettings, updateSettings } from "@/lib/settings";
import { THEME_IDS } from "@/lib/themes";
import { emitChat } from "@/lib/socket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/settings — current settings (theme, limit, maintenance).
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });
  const settings = await getSettings();
  return NextResponse.json({ ok: true, settings });
}

// PATCH /api/admin/settings { theme?, dailyLimit?, maintenanceMode? }
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body.theme === "string" && THEME_IDS.includes(body.theme)) {
    patch.theme = body.theme;
  }
  if (Number.isInteger(body.dailyLimit) && body.dailyLimit >= 1 && body.dailyLimit <= 1000) {
    patch.dailyLimit = body.dailyLimit;
  }
  if (typeof body.maintenanceMode === "boolean") {
    patch.maintenanceMode = body.maintenanceMode;
  }

  const settings = await updateSettings(patch);

  // Broadcast the theme/maintenance change to all clients in real time.
  emitChat("settings:update", settings);

  return NextResponse.json({ ok: true, settings });
}
