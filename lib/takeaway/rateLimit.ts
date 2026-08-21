type Entry = { count: number; resetAt: number };

export class BoundedRateLimiter {
  private readonly entries = new Map<string, Entry>();
  private readonly maximumKeys: number;
  constructor(maximumKeys = 10_000) { this.maximumKeys = maximumKeys; }

  consume(key: string, limit: number, windowMs: number, now = Date.now()) {
    this.prune(now);
    const previous = this.entries.get(key);
    const entry = !previous || previous.resetAt <= now ? { count: 0, resetAt: now + windowMs } : previous;
    entry.count += 1;
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maximumKeys) this.entries.delete(this.entries.keys().next().value!);
    return { limited: entry.count > limit, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  private prune(now: number) {
    for (const [key, value] of this.entries) if (value.resetAt <= now) this.entries.delete(key);
  }
}

export function requestRateLimitKey(headers: Headers) {
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return `ip:${forwarded.slice(0, 64)}`;
    const real = headers.get("x-real-ip")?.trim();
    if (real) return `ip:${real.slice(0, 64)}`;
  }
  return "network:untrusted-proxy";
}
