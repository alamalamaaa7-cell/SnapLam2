import { redis } from "./redis";

// In-memory fallback store (best-effort; per-instance) when Redis is absent.
const memStore = new Map<string, { count: number; resetAt: number }>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiter.
 * @param key    unique bucket key (e.g. `ip:1.2.3.4:dl`)
 * @param limit  max requests per window
 * @param windowSec window length in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateResult> {
  const now = Date.now();

  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }
      const ttl = await redis.ttl(redisKey);
      const resetAt = now + (ttl > 0 ? ttl : windowSec) * 1000;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        limit,
        resetAt,
      };
    } catch {
      // fall through to memory
    }
  }

  const existing = memStore.get(key);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowSec * 1000;
    memStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, limit, resetAt };
  }
  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    limit,
    resetAt: existing.resetAt,
  };
}

// Periodically prune the memory store to avoid unbounded growth.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memStore.entries()) {
      if (v.resetAt < now) memStore.delete(k);
    }
  }, 60_000).unref?.();
}
