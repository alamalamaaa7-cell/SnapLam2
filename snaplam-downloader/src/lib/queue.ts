import { Queue } from "bullmq";
import { redis, hasRedis } from "./redis";

export const DOWNLOAD_QUEUE = "snaplam-downloads";

export interface DownloadJobData {
  downloadId: string; // Mongo Download record id
  socketId?: string;
  url: string;
}

// The queue only exists when Redis is configured. When it's null, the API
// route processes downloads inline (see api/download/route.ts).
export const downloadQueue: Queue<DownloadJobData> | null = hasRedis
  ? new Queue<DownloadJobData>(DOWNLOAD_QUEUE, {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    })
  : null;
