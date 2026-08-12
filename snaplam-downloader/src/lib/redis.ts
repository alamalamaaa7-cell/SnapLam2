import IORedis, { Redis } from "ioredis";

// Upstash Redis is OPTIONAL. When UPSTASH_REDIS_URL is missing we return
// null and callers gracefully degrade (inline processing, in-memory limits).
const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

function createClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) return null;

  const client = new IORedis(url, {
    // BullMQ requires this to be null (blocking commands).
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  client.on("error", (err) => {
    // Don't crash the process on transient Redis hiccups.
    console.error("[redis] error:", err?.message ?? err);
  });

  return client;
}

export const redis: Redis | null =
  globalForRedis.redis ?? createClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export const hasRedis = Boolean(redis);
