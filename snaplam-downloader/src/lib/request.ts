import { NextRequest } from "next/server";

// Extract the best-guess client IP from proxy headers (Railway sits behind
// a proxy, so x-forwarded-for is authoritative).
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "0.0.0.0"
  );
}
