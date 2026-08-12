"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Download,
  Link2,
  Loader2,
  Music,
  Video,
  ImageIcon,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocket } from "@/components/providers/socket-provider";
import { useApp } from "@/components/providers/app-provider";
import { detectPlatform, PLATFORMS, isValidUrl } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { MediaResult, DownloadLink } from "@/lib/fetcher";

const iconFor = (fmt: string) =>
  fmt === "MP3" ? Music : fmt === "IMAGE" ? ImageIcon : Video;

export function Downloader({ onHistoryChange }: { onHistoryChange?: () => void }) {
  const { socket, socketId } = useSocket();
  const { authenticated } = useApp();
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [stage, setStage] = React.useState("");
  const [result, setResult] = React.useState<MediaResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const activeId = React.useRef<string | null>(null);

  const platform = url ? detectPlatform(url) : "unknown";
  const meta = PLATFORMS[platform];

  // Listen to realtime progress for the active download.
  React.useEffect(() => {
    if (!socket) return;
    const onProgress = (p: any) => {
      if (activeId.current && p.downloadId !== activeId.current) return;
      setStage(p.stage);
      setProgress(p.percent);
      if (p.status === "SUKSES" && p.result) {
        setResult(p.result as MediaResult);
        setLoading(false);
        toast.success("Media siap diunduh!");
        onHistoryChange?.();
      } else if (p.status === "GAGAL") {
        setError(p.error || "Gagal memproses.");
        setLoading(false);
        toast.error(p.error || "Gagal memproses.");
        onHistoryChange?.();
      }
    };
    socket.on("download:progress", onProgress);
    return () => {
      socket.off("download:progress", onProgress);
    };
  }, [socket, onHistoryChange]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!authenticated) {
      toast.error("Silakan login dengan Google dulu.");
      return;
    }
    if (!isValidUrl(url)) {
      toast.error("Masukkan URL yang valid.");
      return;
    }
    if (detectPlatform(url) === "unknown") {
      toast.error("Platform tidak didukung.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(5);
    setStage("Mengirim permintaan…");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, socketId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal memproses.");
        setLoading(false);
        setProgress(0);
        toast.error(data.error || "Gagal memproses.");
        return;
      }
      activeId.current = data.downloadId;
      onHistoryChange?.();
      // Fallback: if no socket progress arrives, poll preview after a beat.
      if (!socket?.connected) {
        pollFallback();
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
      setProgress(0);
    }
  };

  // Fallback when websockets are unavailable — fetch metadata directly.
  const pollFallback = async () => {
    try {
      setStage("Mengambil data…");
      setProgress(50);
      const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
      const data = (await res.json()) as MediaResult;
      if (data.ok) {
        setResult(data);
        setProgress(100);
      } else {
        setError(data.error || "Gagal.");
      }
    } catch {
      setError("Gagal mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  const forceDownload = (link: DownloadLink) => {
    // Open the CDN link in a new tab; the browser downloads directly from
    // the provider (server never proxies the file → low memory).
    const a = document.createElement("a");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(`Mengunduh ${link.label}…`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Hero */}
      <div className="mb-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl"
        >
          SnapLam Downloader
        </motion.h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Download Semua Video &amp; Ngobrol Santai — TikTok, YouTube, Instagram, dan lainnya.
        </p>
      </div>

      {/* Input card */}
      <Card className="relative overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Tempel link video di sini…"
              className="pl-9 pr-28"
              disabled={loading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {url && platform !== "unknown" && (
                <Badge className={cn("bg-gradient-to-r", meta.color)}>{meta.label}</Badge>
              )}
            </div>
          </div>
          <Button type="submit" size="lg" disabled={loading || !url}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Memproses…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Download Sekarang
              </>
            )}
          </Button>
        </form>

        {/* Progress bar */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{stage}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full btn-grad"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <Card className="flex items-center gap-3 border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && !result && (
        <Card className="mt-4">
          <div className="flex gap-4">
            <Skeleton className="h-24 w-40 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </Card>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && result.ok && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row">
                {result.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.thumbnail}
                    alt={result.title || "thumbnail"}
                    referrerPolicy="no-referrer"
                    className="h-40 w-full rounded-xl object-cover sm:h-28 sm:w-48"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded-xl bg-muted sm:h-28 sm:w-48">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="line-clamp-2 font-semibold">{result.title || "Media"}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge className={cn("bg-gradient-to-r", PLATFORMS[result.platform].color)}>
                      {PLATFORMS[result.platform].label}
                    </Badge>
                    {result.author && <span>@{result.author}</span>}
                    {result.duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {result.duration}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.links.map((link, i) => {
                      const Icon = iconFor(link.format);
                      return (
                        <Button
                          key={i}
                          size="sm"
                          variant={link.format === "MP3" ? "secondary" : "default"}
                          onClick={() => forceDownload(link)}
                        >
                          <Icon className="h-4 w-4" />
                          {link.label}
                          {link.quality ? ` · ${link.quality}` : ""}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supported platforms strip */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {Object.values(PLATFORMS)
          .filter((p) => p.id !== "unknown")
          .map((p) => (
            <span
              key={p.id}
              className={cn(
                "rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white/90 opacity-80",
                p.color
              )}
            >
              {p.label}
            </span>
          ))}
      </div>
    </div>
  );
}
