import { prisma } from "./prisma";
import { fetchMedia } from "./fetcher";
import { emitDownloadProgress } from "./socket";

/**
 * Core download processing routine, shared by the inline path and the
 * BullMQ worker. It never buffers the media file itself — it resolves the
 * direct CDN links via the provider and streams staged progress over
 * Socket.io. The browser downloads the file directly from the CDN, which
 * keeps server memory usage minimal (crucial for the <512MB budget).
 */
export async function processDownload(opts: {
  downloadId: string;
  url: string;
  socketId?: string;
}) {
  const { downloadId, url, socketId } = opts;

  const emit = (stage: string, percent: number, extra: Record<string, unknown> = {}) =>
    emitDownloadProgress({ downloadId, stage, percent, socketId, ...extra });

  try {
    emit("Menghubungi provider…", 15, { status: "PROSES" });

    const media = await fetchMedia(url);

    emit("Memproses metadata…", 60, { status: "PROSES" });

    if (!media.ok) {
      await prisma.download.update({
        where: { id: downloadId },
        data: { status: "GAGAL", error: media.error, platform: media.platform },
      });
      emit(media.error ?? "Gagal", 100, { status: "GAGAL", error: media.error });
      return { ok: false as const, error: media.error };
    }

    const primaryFormat = media.links[0]?.format ?? "MP4";

    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: "SUKSES",
        platform: media.platform,
        title: media.title,
        thumbnail: media.thumbnail,
        duration: media.duration,
        format: primaryFormat,
      },
    });

    // Bump user's total download counter (best-effort).
    const record = await prisma.download.findUnique({ where: { id: downloadId } });
    if (record?.userId) {
      await prisma.user
        .update({
          where: { id: record.userId },
          data: { totalDownloads: { increment: 1 } },
        })
        .catch(() => {});
    }

    emit("Siap diunduh!", 100, { status: "SUKSES", result: media });
    return { ok: true as const, media };
  } catch (err: any) {
    const message = err?.message ?? "Kesalahan tak terduga.";
    await prisma.download
      .update({ where: { id: downloadId }, data: { status: "GAGAL", error: message } })
      .catch(() => {});
    emit(message, 100, { status: "GAGAL", error: message });
    return { ok: false as const, error: message };
  }
}
