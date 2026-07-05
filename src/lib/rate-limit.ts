/**
 * In-memory sliding-window rate limiter, keyed per route + client.
 * Suitable for a single-instance deployment; swap the store for Redis
 * when scaling horizontally (the call sites stay identical).
 */
type Bucket = { hits: number[]; };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  // periodic cleanup so the map cannot grow unbounded
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) {
      if (b.hits.length === 0 || b.hits[b.hits.length - 1] < now - windowMs) buckets.delete(k);
    }
    lastSweep = now;
  }

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > now - windowMs);
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const retryAfterS = Math.ceil((bucket.hits[0] + windowMs - now) / 1000);
    return { ok: false, retryAfterS };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, retryAfterS: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}
