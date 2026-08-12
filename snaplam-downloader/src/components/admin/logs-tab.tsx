"use client";

import * as React from "react";
import { Search, Download as DownloadIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PLATFORMS } from "@/lib/platforms";

interface LogRow {
  id: string;
  createdAt: string;
  email?: string | null;
  url: string;
  platform: string;
  status: string;
  error?: string | null;
  ip?: string | null;
}

const statusVariant = (s: string) =>
  s === "SUKSES" ? "success" : s === "GAGAL" ? "danger" : "warning";

export function LogsTab() {
  const [rows, setRows] = React.useState<LogRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [platform, setPlatform] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (platform) params.set("platform", platform);
    if (status) params.set("status", status);
    try {
      const res = await fetch(`/api/admin/logs?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setRows(data.items);
        setPages(data.pages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, platform, status]);

  React.useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const params = new URLSearchParams({ export: "csv" });
    if (search) params.set("search", search);
    if (platform) params.set("platform", platform);
    if (status) params.set("status", status);
    window.open(`/api/admin/logs?${params}`, "_blank");
  };

  return (
    <Card>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari email / link / IP…"
            className="pl-9"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-input bg-card/50 px-3 text-sm backdrop-blur"
        >
          <option value="">Semua Platform</option>
          {Object.values(PLATFORMS)
            .filter((p) => p.id !== "unknown")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-input bg-card/50 px-3 text-sm backdrop-blur"
        >
          <option value="">Semua Status</option>
          <option value="SUKSES">Sukses</option>
          <option value="GAGAL">Gagal</option>
          <option value="PROSES">Proses</option>
        </select>
        <Button variant="outline" onClick={exportCsv}>
          <DownloadIcon className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-3">Waktu</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Link</th>
              <th className="py-2 pr-3">Platform</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Error</th>
              <th className="py-2 pr-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Memuat…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Tidak ada log.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="whitespace-nowrap py-2 pr-3 text-xs">{formatDate(r.createdAt)}</td>
                  <td className="py-2 pr-3 text-xs">{r.email || "-"}</td>
                  <td className="max-w-[160px] truncate py-2 pr-3 text-xs">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {r.url}
                    </a>
                  </td>
                  <td className="py-2 pr-3 text-xs capitalize">{r.platform}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={statusVariant(r.status) as any} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="max-w-[140px] truncate py-2 pr-3 text-xs text-red-300">{r.error || "-"}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{r.ip || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Halaman {page} dari {pages}
        </span>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
