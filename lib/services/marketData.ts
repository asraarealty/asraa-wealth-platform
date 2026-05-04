/**
 * Server-side market data service using Yahoo Finance.
 * Must only be imported in server contexts (API Route Handlers, Server Components).
 * Uses an in-memory cache so that repeated requests for the same symbol
 * within the TTL window do not re-hit the external API.
 *
 * Currency handling:
 *   - Symbols ending in ".NS" are NSE stocks priced in INR.
 *   - All other symbols are treated as US stocks priced in USD and are
 *     converted to INR using the live USD/INR FX rate.
 */

import { getExchangeForSymbol } from "./symbolValidator";

// ── Types ────────────────────────────────────────────────────────────────────

/** Normalised price result returned by all public price functions. */
export interface StockPriceResult {
  /** Price in the stock's native currency. */
  price: number;
  currency: "USD" | "INR";
  /** Price converted to INR (equals price when currency is already INR). */
  priceINR: number;
  /** Price in USD (equals price when currency is already USD). */
  priceUSD: number;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  result: StockPriceResult;
  timestamp: number;
}

// Module-level cache shared across all requests within the same Node.js process.
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// FX rate cache (USD → INR)
let fxRate = 0;
let fxRateTimestamp = 0;
const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
/** Approximate fallback when the FX API is unreachable. */
const FX_FALLBACK_RATE = 84;

// ── FX rate helper ────────────────────────────────────────────────────────────

/** Fetch the live USD → INR exchange rate from Yahoo Finance (cached). */
async function getUsdToInrRate(): Promise<number> {
  if (fxRate > 0 && Date.now() - fxRateTimestamp < FX_CACHE_TTL_MS) {
    return fxRate;
  }

  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=1d";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`FX rate fetch returned ${res.status}`);

    const data = await res.json();
    const rate: unknown = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) {
      throw new Error("Invalid FX rate in response");
    }

    fxRate = rate;
    fxRateTimestamp = Date.now();
    return rate;
  } catch (err) {
    console.error("[marketData] getUsdToInrRate failed:", err);
    // Return last known rate or hard-coded fallback
    return fxRate > 0 ? fxRate : FX_FALLBACK_RATE;
  }
}

/** Build a StockPriceResult from a raw price and its native currency. */
async function toStockPriceResult(
  price: number,
  nativeCurrency: "USD" | "INR"
): Promise<StockPriceResult> {
  if (nativeCurrency === "INR") {
    return { price, currency: "INR", priceINR: price, priceUSD: price / (await getUsdToInrRate()) };
  }
  const rate = await getUsdToInrRate();
  return { price, currency: "USD", priceINR: price * rate, priceUSD: price };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch the current market price for a single stock symbol.
 * Returns a zero-valued fallback result when the API is unavailable or
 * returns invalid data.
 */
export async function getStockPrice(
  symbol: string,
  fallback = 0
): Promise<StockPriceResult> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      // Do not let Next.js cache this at the HTTP layer
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta ?? {};
    const price: unknown = meta?.regularMarketPrice;
    const rawCurrency: unknown = meta?.currency;

    if (typeof price !== "number" || !isFinite(price) || price <= 0) {
      throw new Error("Invalid price in response");
    }

    // Prefer the currency reported by the API; fall back to symbol-based inference.
    const nativeCurrency: "USD" | "INR" =
      rawCurrency === "USD"
        ? "USD"
        : rawCurrency === "INR"
        ? "INR"
        : getExchangeForSymbol(symbol) === "NSE"
        ? "INR"
        : "USD";

    const result = await toStockPriceResult(price, nativeCurrency);
    priceCache.set(symbol, { result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error(`[marketData] getStockPrice(${symbol}) failed:`, err);
    const exchange = getExchangeForSymbol(symbol);
    const currency = exchange === "NSE" ? "INR" : "USD";
    return { price: fallback, currency, priceINR: fallback, priceUSD: fallback };
  }
}

/**
 * Batch-fetch current prices for multiple stock symbols.
 * Returns a Map of symbol → StockPriceResult.  Symbols absent from the
 * response (API error, delisted, etc.) are omitted from the map and callers
 * should fall back to avg_price.
 */
export async function getBatchStockPrices(
  symbols: string[]
): Promise<Map<string, StockPriceResult>> {
  const result = new Map<string, StockPriceResult>();
  if (symbols.length === 0) return result;

  const toFetch: string[] = [];

  // Serve from cache where possible
  for (const sym of symbols) {
    const cached = priceCache.get(sym);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      result.set(sym, cached.result);
    } else {
      toFetch.push(sym);
    }
  }

  if (toFetch.length === 0) return result;

  // Pre-fetch the FX rate once so all USD→INR conversions share it.
  const usdToInr = await getUsdToInrRate();

  try {
    const symbolList = toFetch.map(encodeURIComponent).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Yahoo Finance batch returned ${res.status}`);

    const data = await res.json();
    const quotes: unknown[] = data?.quoteResponse?.result ?? [];

    for (const q of quotes) {
      if (!q || typeof q !== "object") continue;
      const quote = q as Record<string, unknown>;
      const sym = typeof quote.symbol === "string" ? quote.symbol : null;
      const price =
        typeof quote.regularMarketPrice === "number"
          ? quote.regularMarketPrice
          : null;

      if (!sym || price === null || !isFinite(price) || price <= 0) continue;

      // Prefer the currency from the API response.
      const rawCurrency = quote.currency;
      const nativeCurrency: "USD" | "INR" =
        rawCurrency === "USD"
          ? "USD"
          : rawCurrency === "INR"
          ? "INR"
          : getExchangeForSymbol(sym) === "NSE"
          ? "INR"
          : "USD";

      const priceResult: StockPriceResult =
        nativeCurrency === "INR"
          ? { price, currency: "INR", priceINR: price, priceUSD: price / usdToInr }
          : { price, currency: "USD", priceINR: price * usdToInr, priceUSD: price };

      priceCache.set(sym, { result: priceResult, timestamp: Date.now() });
      result.set(sym, priceResult);
    }
  } catch (err) {
    console.error("[marketData] getBatchStockPrices failed:", err);
    // Callers handle missing entries via fallback logic
  }

  return result;
}
