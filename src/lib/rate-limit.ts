import { HttpError } from "./authz";

/**
 * Rate limiting with a production backend and a dev fallback.
 *
 * - If Upstash Redis is configured (UPSTASH_REDIS_REST_URL + _TOKEN), limits are
 *   enforced in Redis with a sliding window — correct across many serverless
 *   instances. This is the production path on Vercel.
 * - Otherwise an in-memory token bucket is used (single instance / local dev).
 *
 * Call `enforceRateLimit(bucket, identity)` at the top of a mutation; it throws
 * a 429 HttpError when the caller is over the limit.
 */

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitConfig {
  /** Max requests allowed per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const RATE_LIMITS = {
  login: { max: 10, windowMs: 15 * 60_000 },
  signup: { max: 5, windowMs: 60 * 60_000 },
  listingCreate: { max: 20, windowMs: 60 * 60_000 },
  offerCreate: { max: 30, windowMs: 60 * 60_000 },
  message: { max: 60, windowMs: 60 * 60_000 },
  checkout: { max: 15, windowMs: 60 * 60_000 },
  imagePresign: { max: 60, windowMs: 60 * 60_000 },
  adminSensitive: { max: 100, windowMs: 60 * 60_000 },
  emailVerify: { max: 5, windowMs: 60 * 60_000 },
  phoneVerify: { max: 5, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitKey = keyof typeof RATE_LIMITS;

// ── In-memory fallback ────────────────────────────────────────────────────────

interface Bucket {
  count: number;
  resetAt: number;
}
const store = new Map<string, Bucket>();

function memoryLimit(bucket: RateLimitKey, identity: string): RateLimitResult {
  const cfg = RATE_LIMITS[bucket];
  const key = `${bucket}:${identity}`;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + cfg.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: cfg.max - 1, resetAt };
  }
  if (existing.count >= cfg.max) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { success: true, remaining: cfg.max - existing.count, resetAt: existing.resetAt };
}

if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of store) if (b.resetAt <= now) store.delete(key);
  }, 5 * 60_000);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}

// ── Upstash Redis backend (lazy, optional) ────────────────────────────────────

const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

// Built lazily so the SDK is only loaded when configured, and so each logical
// bucket reuses one Ratelimit instance (with its own ephemeral cache).
const limiters = new Map<RateLimitKey, import("@upstash/ratelimit").Ratelimit>();

async function getUpstashLimiter(bucket: RateLimitKey) {
  const cached = limiters.get(bucket);
  if (cached) return cached;
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  const cfg = RATE_LIMITS[bucket];
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(cfg.max, `${cfg.windowMs} ms`),
    prefix: `mullagain:rl:${bucket}`,
    analytics: false,
  });
  limiters.set(bucket, limiter);
  return limiter;
}

/** Check a limit without throwing. Async to support the Redis backend. */
export async function checkRateLimit(
  bucket: RateLimitKey,
  identity: string,
): Promise<RateLimitResult> {
  if (!upstashConfigured) return memoryLimit(bucket, identity);
  try {
    const limiter = await getUpstashLimiter(bucket);
    const res = await limiter.limit(identity);
    return { success: res.success, remaining: res.remaining, resetAt: res.reset };
  } catch (err) {
    // Never let a limiter outage take down the request path — fail open to memory.
    console.error("[rate-limit] Upstash error, falling back to memory:", err);
    return memoryLimit(bucket, identity);
  }
}

/** Enforce a limit; throws a 429 HttpError when exceeded. */
export async function enforceRateLimit(bucket: RateLimitKey, identity: string): Promise<void> {
  const res = await checkRateLimit(bucket, identity);
  if (!res.success) {
    throw new HttpError(429, "Too many requests. Please slow down.", "RATE_LIMITED");
  }
}
