import { NextResponse } from "next/server";

// In-memory fixed-window rate limiter — a pragmatic stopgap for a single
// long-running Node process (`next start`), with no Redis/Upstash
// provisioned yet. If this ever runs across multiple serverless
// instances/regions, each instance keeps its own counters and the
// effective limit multiplies accordingly — swap this for a shared store
// (e.g. Upstash Ratelimit) before scaling horizontally. Same caveat as
// MockProvider's in-memory state (lib/providers/MockProvider.ts).
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bound memory growth with an opportunistic sweep instead of a timer —
// good enough at this scale, and avoids keeping an interval alive.
const MAX_BUCKETS = 50_000;

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    buckets.forEach((bucket, bucketKey) => {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    });
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { success: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { success: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Trop de requêtes. Réessayez plus tard." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

// `x-forwarded-for` may carry a client-supplied chain in dev/behind a proxy
// we don't control — good enough to key a best-effort limiter, not meant as
// a trust boundary for anything else.
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined> | undefined): string {
  if (!headers) return "unknown";

  function read(name: string): string | undefined {
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const value = (headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(value) ? value[0] : value;
  }

  const forwarded = read("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return read("x-real-ip") ?? "unknown";
}
