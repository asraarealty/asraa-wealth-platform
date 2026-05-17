"use client";

/**
 * Client-side market data service.
 *
 * Rules:
 * - Uses ONLY GET /api/v2/stocks/v2/{symbol} and POST /api/v2/stocks/v2/bulk
 * - Batches all quote requests into a single bulk call
 * - Deduplicates symbols before requesting
 * - Caches results with a 30–60 second TTL to prevent repeated fetches
 * - Refresh interval: 30–60 seconds — never on every render
 * - Supports subscriber pattern so multiple components share one data stream
 */

import { fetcher } from "@/lib/fetcher";
import { logDebug } from "@/lib/utils/debugMetrics";

export interface TickerQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  lastUpdated: number;
}

type TickerSubscriber = (quote: TickerQuote) => void;

const CACHE_TTL_MS = 45_000; // 45-second cache window (within 30–60 s spec)
const REFRESH_INTERVAL_MS = 45_000;

// In-memory cache keyed by normalised uppercase symbol
const quoteCache = new Map<string, TickerQuote>();

// Subscriber registry
const subscribers = new Map<string, Set<TickerSubscriber>>();

// Pending batch request handle
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSymbols = new Set<string>();

// Polling handle
let pollingTimer: ReturnType<typeof setInterval> | null = null;

// ── Symbol normalisation ──────────────────────────────────────────────────────

/**
 * Normalise a ticker symbol to a consistent uppercase format.
 * Strips whitespace and converts to upper case.
 */
export function normalizeTicker(symbol: string): string {
  return symbol.trim().toUpperCase();
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

/** Store a quote in the in-memory cache and notify subscribers. */
export function cacheQuote(quote: TickerQuote): void {
  const key = normalizeTicker(quote.symbol);
  quoteCache.set(key, { ...quote, lastUpdated: Date.now() });
  notifySubscribers(key, quoteCache.get(key)!);
}

/** Return a cached quote if it is still within the TTL window, else null. */
function getCachedQuote(symbol: string): TickerQuote | null {
  const key = normalizeTicker(symbol);
  const entry = quoteCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.lastUpdated > CACHE_TTL_MS) return null;
  return entry;
}

// ── Subscriber pattern ────────────────────────────────────────────────────────

/** Subscribe to real-time quote updates for a symbol. */
export function subscribeTicker(symbol: string, fn: TickerSubscriber): () => void {
  const key = normalizeTicker(symbol);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(fn);

  // Immediately emit cached quote if available
  const cached = quoteCache.get(key);
  if (cached) fn(cached);

  // Schedule a batch fetch for this symbol
  scheduleBatchFetch(key);

  return () => unsubscribeTicker(symbol, fn);
}

/** Unsubscribe from quote updates for a symbol. */
export function unsubscribeTicker(symbol: string, fn: TickerSubscriber): void {
  const key = normalizeTicker(symbol);
  const set = subscribers.get(key);
  if (!set) return;
  set.delete(fn);
  if (set.size === 0) {
    subscribers.delete(key);
    stopPollingIfIdle();
  }
}

function notifySubscribers(symbol: string, quote: TickerQuote): void {
  const set = subscribers.get(normalizeTicker(symbol));
  if (!set) return;
  for (const fn of set) fn(quote);
}

// ── Batch fetching ─────────────────────────────────────────────────────────────

/** Queue a symbol for inclusion in the next bulk fetch. */
function scheduleBatchFetch(symbol: string): void {
  pendingSymbols.add(normalizeTicker(symbol));
  if (batchTimer) return; // already scheduled
  batchTimer = setTimeout(() => {
    batchTimer = null;
    void flushBatch();
  }, 50); // micro-batch within 50 ms
}

/** Execute a bulk fetch for all pending symbols. */
async function flushBatch(): Promise<void> {
  const symbols = [...pendingSymbols];
  pendingSymbols = new Set();
  if (symbols.length === 0) return;

  // Filter to symbols not already in cache
  const stale = symbols.filter((s) => !getCachedQuote(s));
  if (stale.length === 0) {
    logDebug("marketDataService", "All symbols served from cache", { symbols });
    return;
  }

  logDebug("marketDataService", "Bulk quote fetch", { symbols: stale });
  await fetchBulkQuotes(stale);
  startPollingIfNeeded();
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch quotes for multiple symbols in a single request via the v2 bulk endpoint.
 * Falls back to individual v2 requests when bulk is unavailable.
 */
export async function fetchBulkQuotes(symbols: string[]): Promise<Map<string, TickerQuote>> {
  const result = new Map<string, TickerQuote>();
  if (symbols.length === 0) return result;

  const deduplicated = [...new Set(symbols.map(normalizeTicker))];

  try {
    const rawResponse = await fetcher<unknown>("/stocks/v2/bulk", {
      method: "POST",
      body: { symbols: deduplicated },
      raw: true,
      noRedirectOn401: true,
    });

    const quotes = parseQuoteResponse(rawResponse);
    for (const quote of quotes) {
      cacheQuote(quote);
      result.set(normalizeTicker(quote.symbol), quote);
    }

    logDebug("marketDataService", "Bulk fetch success", {
      requested: deduplicated.length,
      received: quotes.length,
    });
  } catch (bulkErr) {
    logDebug("marketDataService", "Bulk fetch failed, falling back to individual requests", {
      error: bulkErr,
      symbols: deduplicated,
    });

    // Sequential individual fallback
    await Promise.allSettled(
      deduplicated.map(async (symbol) => {
        try {
          const quote = await fetchSingleQuoteV2(symbol);
          if (quote) {
            cacheQuote(quote);
            result.set(normalizeTicker(symbol), quote);
          }
        } catch {
          // Ignore individual failures; callers use avg_price fallback
        }
      })
    );
  }

  return result;
}

/** Fetch a single quote from the v2 endpoint only. */
async function fetchSingleQuoteV2(symbol: string): Promise<TickerQuote | null> {
  const raw = await fetcher<unknown>(`/stocks/v2/${encodeURIComponent(symbol)}`, {
    raw: true,
    noRedirectOn401: true,
  });
  const quotes = parseQuoteResponse(raw);
  return quotes[0] ?? null;
}

// ── Response normalisation ────────────────────────────────────────────────────

function parseQuoteResponse(raw: unknown): TickerQuote[] {
  const data = unwrap(raw);
  const list = Array.isArray(data) ? data : data ? [data] : [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const q = item as Record<string, unknown>;
    const symbol = typeof q.symbol === "string" ? q.symbol : "";
    if (!symbol) return [];
    return [
      {
        symbol,
        name: typeof q.name === "string" ? q.name : symbol,
        price: toNum(q.price ?? q.regularMarketPrice),
        change: toNum(q.change ?? q.regularMarketChange),
        changePercent: toNum(q.changePercent ?? q.regularMarketChangePercent),
        volume: toNum(q.volume ?? q.regularMarketVolume),
        marketCap: toNum(q.marketCap),
        lastUpdated: Date.now(),
      },
    ];
  });
}

function unwrap(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  if (r.data && typeof r.data === "object" && "data" in (r.data as object)) {
    return (r.data as Record<string, unknown>).data;
  }
  if ("data" in r) return r.data;
  return raw;
}

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// ── Background polling ────────────────────────────────────────────────────────

/** Start polling only when there are active subscribers. */
function startPollingIfNeeded(): void {
  if (pollingTimer) return;
  if (subscribers.size === 0) return;

  pollingTimer = setInterval(() => {
    const activeSymbols = [...subscribers.keys()];
    if (activeSymbols.length === 0) {
      stopPolling();
      return;
    }
    logDebug("marketDataService", "Polling refresh", { symbols: activeSymbols });
    void fetchBulkQuotes(activeSymbols);
  }, REFRESH_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function stopPollingIfIdle(): void {
  if (subscribers.size === 0) stopPolling();
}

// ── Convenience hook helper ───────────────────────────────────────────────────

/**
 * Get the current cached quote for a symbol synchronously (optimistic rendering).
 * Returns null if not yet loaded.
 */
export function getOptimisticQuote(symbol: string): TickerQuote | null {
  return quoteCache.get(normalizeTicker(symbol)) ?? null;
}
