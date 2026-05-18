interface CacheValue<T> {
  value: T;
  updatedAt: number;
}

export interface RequestCacheOptions {
  ttlMs: number;
  staleMs?: number;
}

export function createRequestCache<T>(options: RequestCacheOptions) {
  const values = new Map<string, CacheValue<T>>();
  const inflight = new Map<string, Promise<T>>();

  const staleMs = options.staleMs ?? options.ttlMs;

  const read = (key: string): { value: T; stale: boolean } | null => {
    const entry = values.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.updatedAt;
    if (age > staleMs) {
      values.delete(key);
      return null;
    }
    return { value: entry.value, stale: age > options.ttlMs };
  };

  const write = (key: string, value: T) => {
    values.set(key, { value, updatedAt: Date.now() });
  };

  const getOrCreate = (key: string, create: () => Promise<T>): Promise<T> => {
    const existing = inflight.get(key);
    if (existing) return existing;
    const job = create().finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  };

  const clear = () => {
    inflight.clear();
    values.clear();
  };

  return { read, write, getOrCreate, clear };
}

export async function withRetryBackoff<T>(
  run: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }
  }

  throw lastError;
}

export function boundRefreshInterval(intervalMs: number, minMs: number, maxMs: number) {
  return Math.max(minMs, Math.min(maxMs, intervalMs));
}
