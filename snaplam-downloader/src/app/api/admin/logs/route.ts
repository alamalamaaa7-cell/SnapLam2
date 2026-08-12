import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/logs?search=&platform=&status=&export=csv&page=1
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search")?.trim() || "";
  const platform = sp.get("platform")?.trim() || "";
  const status = sp.get("status")?.trim() || "";
  const asCsv = sp.get("export") === "csv";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = 25;

  const where: any = {};
  if (platform) where.platform = platform;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
      { ip: { contains: search } },
    ];
  }

  if (asCsv) {
    const rows = await prisma.download.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const header = ["Waktu", "Email", "Link", "Platform", "Status", "Error", "IP"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          escape(formatDate(r.createdAt)),
          escape(r.email),
          escape(r.url),
          escape(r.platform),
          escape(r.status),
          escape(r.error),
          escape(r.ip),
        ].join(",")
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="snaplam-logs-${Date.now()}.csv"`,
      },
    });
  }

  const [total, items] = await Promise.all([
    prisma.download.count({ where }),
    prisma.download.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
    items,
  });
}
