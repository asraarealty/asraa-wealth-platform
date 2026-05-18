"use client";

import { fetcher } from "@/lib/fetcher";
import { createRequestCache, withRetryBackoff, boundRefreshInterval } from "@/domains/market/cache";
import type { CanonicalAssetHolding } from "@/lib/services/assets";

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

export interface MarketPricePoint {
  price: number;
  source:
    | "stock-realtime"
    | "stock-bulk"
    | "mf-nav-daily"
    | "commodity-live"
    | "property-static";
  asOf: string;
}

type TickerSubscriber = (quote: TickerQuote) => void;

const QUOTE_TTL_MS = 45_000;
const QUOTE_STALE_MS = 5 * 60_000;
const POLL_INTERVAL_MS = boundRefreshInterval(45_000, 30_000, 60_000);
const MAX_PARTIAL_FALLBACK = 3;

const quoteCache = createRequestCache<TickerQuote>({ ttlMs: QUOTE_TTL_MS, staleMs: QUOTE_STALE_MS });
const mfQuoteCache = createRequestCache<number>({ ttlMs: 60_000, staleMs: 5 * 60_000 });
const commodityQuoteCache = createRequestCache<number>({ ttlMs: 60_000, staleMs: 5 * 60_000 });

const subscribers = new Map<string, Set<TickerSubscriber>>();
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let pollingController: AbortController | null = null;

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrap(value: unknown): unknown {
  const record = safeRecord(value);
  if (record.data && typeof record.data === "object" && "data" in safeRecord(record.data)) {
    return safeRecord(record.data).data;
  }
  if ("data" in record) return record.data;
  return value;
}

export function normalizeTicker(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function getOptimisticQuote(symbol: string): TickerQuote | null {
  return quoteCache.read(normalizeTicker(symbol))?.value ?? null;
}

function cacheQuote(quote: TickerQuote) {
  const normalized = normalizeTicker(quote.symbol);
  const next = { ...quote, symbol: normalized, lastUpdated: Date.now() };
  quoteCache.write(normalized, next);
  const set = subscribers.get(normalized);
  if (set) {
    for (const listener of set) listener(next);
  }
}

function parseQuoteResponse(payload: unknown): TickerQuote[] {
  const data = unwrap(payload);
  const list = Array.isArray(data) ? data : data ? [data] : [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const quote = item as Record<string, unknown>;
    const symbol = typeof quote.symbol === "string" ? normalizeTicker(quote.symbol) : "";
    if (!symbol) return [];
    return [
      {
        symbol,
        name: typeof quote.name === "string" ? quote.name : symbol,
        price: toNum(quote.price ?? quote.regularMarketPrice),
        change: toNum(quote.change ?? quote.regularMarketChange),
        changePercent: toNum(quote.changePercent ?? quote.regularMarketChangePercent),
        volume: toNum(quote.volume ?? quote.regularMarketVolume),
        marketCap: toNum(quote.marketCap),
        lastUpdated: Date.now(),
      },
    ];
  });
}

async function fetchSingleQuoteV2(symbol: string, signal?: AbortSignal): Promise<TickerQuote | null> {
  const raw = await fetcher<unknown>(`/stocks/v2/${encodeURIComponent(symbol)}`, {
    raw: true,
    noRedirectOn401: true,
    cache: "no-store",
    signal,
  });
  return parseQuoteResponse(raw)[0] ?? null;
}

async function requestBulkQuotes(symbols: string[], signal?: AbortSignal): Promise<TickerQuote[]> {
  const payload = await fetcher<unknown>("/stocks/v2/bulk", {
    method: "POST",
    body: { symbols },
    raw: true,
    noRedirectOn401: true,
    cache: "no-store",
    signal,
  });
  return parseQuoteResponse(payload);
}

export async function fetchBulkQuotes(
  symbols: string[],
  options: { signal?: AbortSignal; preservePreviousData?: boolean } = {}
): Promise<Map<string, TickerQuote>> {
  const normalized = [...new Set(symbols.map(normalizeTicker).filter(Boolean))];
  const result = new Map<string, TickerQuote>();
  if (normalized.length === 0) return result;

  const staleSymbols: string[] = [];
  for (const symbol of normalized) {
    const cached = quoteCache.read(symbol);
    if (cached?.value) {
      result.set(symbol, cached.value);
      if (cached.stale) staleSymbols.push(symbol);
    } else {
      staleSymbols.push(symbol);
    }
  }

  if (staleSymbols.length === 0) return result;

  try {
    const freshQuotes = await withRetryBackoff(
      () => requestBulkQuotes(staleSymbols, options.signal),
      { retries: 2, baseDelayMs: 250 }
    );

    const freshSymbols = new Set<string>();
    for (const quote of freshQuotes) {
      cacheQuote(quote);
      const key = normalizeTicker(quote.symbol);
      freshSymbols.add(key);
      result.set(key, quote);
    }

    const unresolved = staleSymbols.filter((symbol) => !freshSymbols.has(symbol)).slice(0, MAX_PARTIAL_FALLBACK);
    if (unresolved.length > 0) {
      await Promise.allSettled(
        unresolved.map(async (symbol) => {
          const quote = await withRetryBackoff(() => fetchSingleQuoteV2(symbol, options.signal), {
            retries: 1,
            baseDelayMs: 200,
          });
          if (!quote) return;
          cacheQuote(quote);
          result.set(symbol, quote);
        })
      );
    }
  } catch {
    if (!options.preservePreviousData) throw new Error("Quote refresh failed");
  }

  return result;
}

function startPollingIfNeeded() {
  if (pollingTimer || subscribers.size === 0) return;
  pollingTimer = setInterval(() => {
    const symbols = [...subscribers.keys()];
    if (symbols.length === 0) {
      stopPolling();
      return;
    }

    pollingController?.abort();
    pollingController = new AbortController();
    void fetchBulkQuotes(symbols, {
      signal: pollingController.signal,
      preservePreviousData: true,
    }).catch(() => undefined);
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  pollingController?.abort();
  pollingController = null;
}

export function subscribeTicker(symbol: string, listener: TickerSubscriber) {
  const normalized = normalizeTicker(symbol);
  if (!subscribers.has(normalized)) subscribers.set(normalized, new Set());
  subscribers.get(normalized)!.add(listener);

  const cached = quoteCache.read(normalized)?.value;
  if (cached) listener(cached);

  void fetchBulkQuotes([normalized], { preservePreviousData: true }).catch(() => undefined);
  startPollingIfNeeded();

  return () => unsubscribeTicker(normalized, listener);
}

export function unsubscribeTicker(symbol: string, listener: TickerSubscriber) {
  const normalized = normalizeTicker(symbol);
  const set = subscribers.get(normalized);
  if (!set) return;
  set.delete(listener);
  if (set.size === 0) subscribers.delete(normalized);
  if (subscribers.size === 0) stopPolling();
}

async function fetchMutualFundPrice(query: string): Promise<number> {
  const key = normalizeTicker(query);
  const cached = mfQuoteCache.read(key);
  if (cached?.value) return cached.value;

  return mfQuoteCache.getOrCreate(key, async () => {
    try {
      const payload = await fetcher<unknown>(`/mutual-funds/search?q=${encodeURIComponent(query)}`, {
        noRedirectOn401: true,
        raw: true,
        cache: "no-store",
      });
      const list = Array.isArray(unwrap(payload)) ? (unwrap(payload) as Array<Record<string, unknown>>) : [];
      const nav = toNum(list[0]?.nav);
      if (nav > 0) mfQuoteCache.write(key, nav);
      return nav;
    } catch {
      return 0;
    }
  });
}

async function fetchCommodityPrice(query: string): Promise<number> {
  const key = normalizeTicker(query);
  const cached = commodityQuoteCache.read(key);
  if (cached?.value) return cached.value;

  return commodityQuoteCache.getOrCreate(key, async () => {
    try {
      const payload = await fetcher<unknown>(`/commodities/search?q=${encodeURIComponent(query)}`, {
        noRedirectOn401: true,
        raw: true,
        cache: "no-store",
      });

      const data = unwrap(payload);
      const candidates = Array.isArray(data)
        ? data
        : data && typeof data === "object"
        ? [data as Record<string, unknown>]
        : [];

      const value = candidates.reduce((price, item) => Math.max(price, toNum(item.price ?? item.ltp ?? item.last_price)), 0);
      if (value > 0) commodityQuoteCache.write(key, value);
      return value;
    } catch {
      return 0;
    }
  });
}

export async function resolveMarketPricePoints(holdings: CanonicalAssetHolding[]): Promise<Record<number, MarketPricePoint>> {
  const byId: Record<number, MarketPricePoint> = {};
  const asOf = new Date().toISOString();

  const stockHoldings = holdings.filter((holding) => holding.type === "stock" && holding.symbol?.trim());
  const stockSymbols = [...new Set(stockHoldings.map((holding) => normalizeTicker(holding.symbol || "")).filter(Boolean))];

  if (stockSymbols.length > 0) {
    const map = await fetchBulkQuotes(stockSymbols, { preservePreviousData: true });
    for (const holding of stockHoldings) {
      const symbol = normalizeTicker(holding.symbol || "");
      const quote = map.get(symbol) ?? quoteCache.read(symbol)?.value;
      if (quote?.price) {
        byId[holding.id] = { price: quote.price, source: "stock-bulk", asOf };
      }
    }
  }

  await Promise.all(
    holdings.map(async (holding) => {
      if (byId[holding.id]) return;
      if (holding.type === "mf") {
        const price = await fetchMutualFundPrice(holding.symbol || holding.name);
        if (price > 0) {
          byId[holding.id] = { price, source: "mf-nav-daily", asOf };
          return;
        }
      }

      if (holding.type === "commodity") {
        const price = await fetchCommodityPrice(holding.symbol || holding.name);
        if (price > 0) {
          byId[holding.id] = { price, source: "commodity-live", asOf };
          return;
        }
      }

      if (holding.type === "property") {
        const propertyPrice = toNum(holding.raw.current_value ?? holding.currentPrice ?? holding.fallbackValue);
        byId[holding.id] = { price: propertyPrice, source: "property-static", asOf };
      }
    })
  );

  return byId;
}
