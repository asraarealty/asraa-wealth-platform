type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  current.count += 1;
  buckets.set(key, current);

  const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
  const remaining = Math.max(0, max - current.count);
  return {
    allowed: current.count <= max,
    remaining,
    retryAfterSeconds,
  };
}
