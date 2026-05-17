/**
 * Frontend observability utilities.
 *
 * All exports are no-ops in production. Enable by setting the environment
 * variable NEXT_PUBLIC_DEBUG_METRICS=true in your .env.local file.
 *
 * Tracks:
 * - Duplicate fetches
 * - Failed mutations
 * - Query / render timing
 * - Cache misses
 * - WebSocket reconnects
 */

const IS_DEV =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEBUG_METRICS === "true";

type MetricCategory =
  | "query"
  | "mutation"
  | "render"
  | "cache"
  | "websocket"
  | "marketDataService"
  | string;

interface MetricEntry {
  category: MetricCategory;
  event: string;
  data?: Record<string, unknown>;
  timestamp: number;
  durationMs?: number;
}

// In-memory ring buffer (last 200 entries) for inspection from DevTools
const _buffer: MetricEntry[] = [];
const BUFFER_SIZE = 200;

function record(entry: MetricEntry): void {
  if (!IS_DEV) return;
  _buffer.push(entry);
  if (_buffer.length > BUFFER_SIZE) _buffer.shift();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Log a debug event (development only).
 *
 * @example
 * logDebug("query", "cache miss", { queryKey: ["dashboard-full"] });
 */
export function logDebug(
  category: MetricCategory,
  event: string,
  data?: Record<string, unknown>
): void {
  if (!IS_DEV) return;
  const entry: MetricEntry = { category, event, data, timestamp: Date.now() };
  record(entry);
  console.debug(`[${category}] ${event}`, data ?? "");
}

/**
 * Warn about a duplicate fetch (same key triggered within debounce window).
 */
export function warnDuplicateFetch(queryKey: unknown[]): void {
  if (!IS_DEV) return;
  const key = JSON.stringify(queryKey);
  console.warn(`[query] Duplicate fetch detected for key: ${key}`);
  record({ category: "query", event: "duplicate_fetch", data: { key }, timestamp: Date.now() });
}

/**
 * Log a failed mutation with its error.
 */
export function logMutationFailure(
  mutationKey: string,
  error: unknown
): void {
  if (!IS_DEV) return;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[mutation] Failed: ${mutationKey} — ${message}`);
  record({
    category: "mutation",
    event: "failure",
    data: { mutationKey, message },
    timestamp: Date.now(),
  });
}

/**
 * Record query execution time.
 */
export function logQueryTiming(
  queryKey: unknown[],
  durationMs: number
): void {
  if (!IS_DEV) return;
  const key = JSON.stringify(queryKey);
  record({ category: "query", event: "timing", data: { key, durationMs }, timestamp: Date.now(), durationMs });
  if (durationMs > 2000) {
    console.warn(`[query] Slow query (${durationMs}ms): ${key}`);
  }
}

/**
 * Record render timing for a component.
 */
export function logRenderTiming(
  componentName: string,
  durationMs: number
): void {
  if (!IS_DEV) return;
  record({
    category: "render",
    event: "timing",
    data: { componentName, durationMs },
    timestamp: Date.now(),
    durationMs,
  });
  if (durationMs > 100) {
    console.warn(`[render] Slow render (${durationMs}ms): ${componentName}`);
  }
}

/**
 * Record a React Query cache miss.
 */
export function logCacheMiss(queryKey: unknown[]): void {
  if (!IS_DEV) return;
  const key = JSON.stringify(queryKey);
  record({ category: "cache", event: "miss", data: { key }, timestamp: Date.now() });
  console.debug(`[cache] Miss: ${key}`);
}

/**
 * Record a WebSocket reconnect event.
 */
export function logWebSocketReconnect(url: string, attempt: number): void {
  if (!IS_DEV) return;
  record({
    category: "websocket",
    event: "reconnect",
    data: { url, attempt },
    timestamp: Date.now(),
  });
  console.debug(`[websocket] Reconnect #${attempt}: ${url}`);
}

/**
 * Export the in-memory metrics buffer for inspection.
 * Accessible from DevTools via `window.__asraaMetrics()`.
 */
export function getMetricsBuffer(): MetricEntry[] {
  return [..._buffer];
}

// Attach to window in development for DevTools access
if (IS_DEV && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__asraaMetrics = getMetricsBuffer;
}
