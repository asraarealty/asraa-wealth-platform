import { fetcher } from "@/lib/fetcher";
import { searchMutualFunds } from "@/lib/api";
import type { CanonicalAssetHolding } from "@/lib/services/assets";
import { getMarketCapabilities } from "@/lib/services/market/capabilities";
import { normalizeMarketSymbol } from "@/lib/services/market/symbolNormalizer";

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

interface CachedQuote {
  price: number;
  asOf: string;
  updatedAt: number;
}

const QUOTE_FRESH_MS = 60_000;
const QUOTE_STALE_MS = 5 * 60_000;

const stockQuoteCache = new Map<string, CachedQuote>();
const singleQuoteInFlight = new Map<string, Promise<number | null>>();
const bulkQuoteInFlight = new Map<string, Promise<Record<string, number>>>();
const mfQuoteCache = new Map<string, CachedQuote>();
const mfInFlight = new Map<string, Promise<number>>();
const commodityQuoteCache = new Map<string, CachedQuote>();
const commodityInFlight = new Map<string, Promise<number>>();

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Utility pause used by retry backoff between quote attempts. */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(250 * 2 ** attempt);
      }
    }
  }
  throw lastError;
}

function extractPrice(value: unknown): number {
  return n(
    (value as any)?.price ??
      (value as any)?.ltp ??
      (value as any)?.last_price ??
      (value as any)?.current_price ??
      (value as any)?.close,
    0
  );
}

function extractBulkQuoteMap(payload: unknown): Record<string, number> {
  const quotes: Record<string, number> = {};
  const queue: unknown[] = [payload];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current !== "object") continue;
    const record = current as Record<string, unknown>;

    const symbol =
      typeof record.symbol === "string"
        ? record.symbol
        : typeof record.ticker === "string"
        ? record.ticker
        : typeof record.code === "string"
        ? record.code
        : null;

    if (symbol) {
      const normalized = normalizeMarketSymbol(symbol);
      const price = extractPrice(record);
      if (price > 0) quotes[normalized] = price;
    }

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "number") {
        const normalizedKey = normalizeMarketSymbol(key);
        if (normalizedKey && value > 0) quotes[normalizedKey] = value;
        continue;
      }

      if (Array.isArray(value) || (value && typeof value === "object")) {
        queue.push(value);
      }
    }
  }

  return quotes;
}

function readCachedStockQuote(symbol: string): { price: number; stale: boolean } | null {
  const cached = stockQuoteCache.get(symbol);
  if (!cached) return null;

  const age = Date.now() - cached.updatedAt;
  if (age > QUOTE_STALE_MS) {
    stockQuoteCache.delete(symbol);
    return null;
  }

  return {
    price: cached.price,
    stale: age > QUOTE_FRESH_MS,
  };
}

function cacheStockQuote(symbol: string, price: number) {
  if (!(price > 0)) return;
  stockQuoteCache.set(symbol, {
    price,
    asOf: new Date().toISOString(),
    updatedAt: Date.now(),
  });
}

function readCachedQuote(cache: Map<string, CachedQuote>, key: string): number | null {
  const cached = cache.get(key);
  if (!cached) return null;
  const age = Date.now() - cached.updatedAt;
  if (age > QUOTE_STALE_MS) {
    cache.delete(key);
    return null;
  }
  return cached.price > 0 ? cached.price : null;
}

function cacheQuote(cache: Map<string, CachedQuote>, key: string, price: number) {
  if (!(price > 0)) return;
  cache.set(key, {
    price,
    asOf: new Date().toISOString(),
    updatedAt: Date.now(),
  });
}

async function fetchSingleStockQuote(symbol: string): Promise<number | null> {
  const existing = singleQuoteInFlight.get(symbol);
  if (existing) return existing;

  const job = withRetry(async () => {
    const quote = await fetcher<any>(`/stocks/${encodeURIComponent(symbol)}`, {
      raw: true,
      noRedirectOn401: true,
      cache: "no-store",
    });
    const price = extractPrice(quote);
    if (price > 0) {
      cacheStockQuote(symbol, price);
      return price;
    }
    return null;
  });

  singleQuoteInFlight.set(symbol, job);
  try {
    return await job;
  } finally {
    singleQuoteInFlight.delete(symbol);
  }
}

async function fetchBulkStockQuotes(symbols: string[]): Promise<Record<string, number>> {
  const key = [...new Set(symbols)].sort().join("\u0000");
  if (!key) return {};

  const existing = bulkQuoteInFlight.get(key);
  if (existing) return existing;

  const job = withRetry(async () => {
    const payload = await fetcher<any>("/stocks/v2/bulk", {
      method: "POST",
      body: { symbols },
      raw: true,
      noRedirectOn401: true,
      cache: "no-store",
    });

    const parsed = extractBulkQuoteMap(payload);
    for (const [symbol, price] of Object.entries(parsed)) cacheStockQuote(symbol, price);
    return parsed;
  });

  bulkQuoteInFlight.set(key, job);
  try {
    return await job;
  } finally {
    bulkQuoteInFlight.delete(key);
  }
}

async function hydrateStockQuotes(
  symbols: string[],
  options: { waitForResult: boolean }
): Promise<void> {
  if (symbols.length === 0) return;

  const capabilities = await getMarketCapabilities({ staleWhileRevalidate: true });
  const normalized = [...new Set(symbols.map(normalizeMarketSymbol).filter(Boolean))];
  if (normalized.length === 0) return;

  const run = async () => {
    if (capabilities.bulkQuotes) {
      const bulkMap = await fetchBulkStockQuotes(normalized);
      const unresolved = normalized.filter((symbol) => !(bulkMap[symbol] > 0));

      if (capabilities.stockQuotes && unresolved.length > 0 && unresolved.length <= 3) {
        await Promise.all(unresolved.map((symbol) => fetchSingleStockQuote(symbol).catch(() => null)));
      }
      return;
    }

    if (capabilities.stockQuotes && normalized.length <= 3) {
      await Promise.all(normalized.map((symbol) => fetchSingleStockQuote(symbol).catch(() => null)));
    }
  };

  if (options.waitForResult) {
    await run();
  } else {
    void run();
  }
}

function commodityPriceFromPayload(payload: any): number {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : payload?.results && Array.isArray(payload.results)
    ? payload.results
    : payload
    ? [payload]
    : [];

  for (const item of candidates) {
    const price = extractPrice(item);
    if (Number.isFinite(price) && price > 0) return price;
  }
  return 0;
}

async function fetchMutualFundQuote(query: string): Promise<number> {
  const key = normalizeMarketSymbol(query);
  const cached = readCachedQuote(mfQuoteCache, key);
  if (cached) return cached;

  const existing = mfInFlight.get(key);
  if (existing) return existing;

  const job = searchMutualFunds(query)
    .then((results) => {
      const first = Array.isArray(results) ? results[0] : undefined;
      const price = n(first?.nav, 0);
      cacheQuote(mfQuoteCache, key, price);
      return price;
    })
    .catch(() => 0);

  mfInFlight.set(key, job);
  try {
    return await job;
  } finally {
    mfInFlight.delete(key);
  }
}

async function fetchCommodityQuote(query: string): Promise<number> {
  const key = normalizeMarketSymbol(query);
  const cached = readCachedQuote(commodityQuoteCache, key);
  if (cached) return cached;

  const existing = commodityInFlight.get(key);
  if (existing) return existing;

  const job = fetcher<any>(`/commodities/search?q=${encodeURIComponent(query)}`, {
    raw: true,
    noRedirectOn401: true,
  })
    .then((payload) => {
      const price = commodityPriceFromPayload(payload);
      cacheQuote(commodityQuoteCache, key, price);
      return price;
    })
    .catch(() => 0);

  commodityInFlight.set(key, job);
  try {
    return await job;
  } finally {
    commodityInFlight.delete(key);
  }
}

export async function resolveLivePrices(
  holdings: CanonicalAssetHolding[]
): Promise<Record<number, MarketPricePoint>> {
  const byId: Record<number, MarketPricePoint> = {};
  const asOf = new Date().toISOString();

  const stockHoldings = holdings.filter((holding) => holding.type === "stock" && holding.symbol?.trim());
  const staleStockSymbols = new Set<string>();
  const missingStockSymbols = new Set<string>();

  for (const holding of stockHoldings) {
    const symbol = normalizeMarketSymbol(holding.symbol);
    if (!symbol) continue;

    const cached = readCachedStockQuote(symbol);
    if (cached?.price) {
      byId[holding.id] = {
        price: cached.price,
        source: "stock-bulk",
        asOf,
      };
      if (cached.stale) staleStockSymbols.add(symbol);
    } else {
      missingStockSymbols.add(symbol);
    }
  }

  if (missingStockSymbols.size > 0) {
    await hydrateStockQuotes([...missingStockSymbols], { waitForResult: true });
  }

  for (const holding of stockHoldings) {
    const symbol = normalizeMarketSymbol(holding.symbol);
    if (!symbol || byId[holding.id]) continue;

    const cached = readCachedStockQuote(symbol);
    if (cached?.price) {
      byId[holding.id] = {
        price: cached.price,
        source: "stock-bulk",
        asOf,
      };
    }
  }

  if (staleStockSymbols.size > 0) {
    void hydrateStockQuotes([...staleStockSymbols], { waitForResult: false });
  }

  const jobs = holdings.map(async (holding) => {
    try {
      if (holding.type === "mf") {
        const price = await fetchMutualFundQuote(holding.symbol || holding.name);
        if (price > 0) {
          byId[holding.id] = { price, source: "mf-nav-daily", asOf };
          return;
        }
      }

      if (holding.type === "commodity") {
        const price = await fetchCommodityQuote(holding.symbol || holding.name);
        if (price > 0) {
          byId[holding.id] = { price, source: "commodity-live", asOf };
          return;
        }
      }

      if (holding.type === "property") {
        const price = n(holding.raw.current_value ?? holding.currentPrice ?? holding.fallbackValue, 0);
        byId[holding.id] = { price, source: "property-static", asOf };
      }
    } catch {
      // fallback handled by valuation engine
    }
  });

  await Promise.all(jobs);
  return byId;
}
