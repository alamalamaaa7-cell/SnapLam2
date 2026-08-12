"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { History, Trash2, Video, Music, ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS } from "@/lib/platforms";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface HistoryItem {
  id: string;
  url: string;
  platform: string;
  title?: string | null;
  thumbnail?: string | null;
  format?: string | null;
  status: "PROSES" | "SUKSES" | "GAGAL";
  createdAt: string;
}

const statusVariant = (s: string) =>
  s === "SUKSES" ? "success" : s === "GAGAL" ? "danger" : "warning";

const fmtIcon = (f?: string | null) =>
  f === "MP3" ? Music : f === "IMAGE" ? ImageIcon : Video;

export interface HistoryHandle {
  reload: () => void;
}

export const HistoryPanel = React.forwardRef<HistoryHandle>((_, ref) => {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useImperativeHandle(ref, () => ({ reload: load }), [load]);

  React.useEffect(() => {
    load();
  }, [load]);

  const clearAll = async () => {
    if (!confirm("Hapus semua riwayat?")) return;
    await fetch("/api/history", { method: "DELETE" });
    setItems([]);
    toast.success("Riwayat dihapus.");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <History className="h-4 w-4" /> Riwayat
        </h2>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={load} title="Muat ulang">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={clearAll} title="Hapus semua">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-soft flex gap-3 p-2">
              <Skeleton className="h-12 w-16 rounded-lg" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <History className="mb-2 h-8 w-8 opacity-50" />
            Belum ada riwayat unduhan.
          </div>
        ) : (
          items.map((item, i) => {
            const meta = PLATFORMS[item.platform as keyof typeof PLATFORMS] ?? PLATFORMS.unknown;
            const Icon = fmtIcon(item.format);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-soft flex gap-3 p-2"
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-12 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.title || item.url}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full bg-gradient-to-r px-1.5 py-0.5 text-[10px] font-medium text-white",
                        meta.color
                      )}
                    >
                      {meta.label}
                    </span>
                    <Badge variant={statusVariant(item.status) as any} className="text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
});
HistoryPanel.displayName = "HistoryPanel";
