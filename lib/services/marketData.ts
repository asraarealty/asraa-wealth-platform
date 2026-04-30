/**
 * Server-side market data service using Yahoo Finance.
 * Must only be imported in server contexts (API Route Handlers, Server Components).
 * Uses an in-memory cache so that repeated requests for the same symbol
 * within the TTL window do not re-hit the external API.
 */

interface CacheEntry {
  price: number;
  timestamp: number;
}

// Module-level cache shared across all requests within the same Node.js process.
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch the current market price for a single stock symbol.
 * Returns `fallback` (defaults to 0) when the API is unavailable or returns
 * invalid data.
 */
export async function getStockPrice(
  symbol: string,
  fallback = 0
): Promise<number> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
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
    const price: unknown = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (typeof price !== "number" || !isFinite(price) || price <= 0) {
      throw new Error("Invalid price in response");
    }

    priceCache.set(symbol, { price, timestamp: Date.now() });
    return price;
  } catch (err) {
    console.error(`[marketData] getStockPrice(${symbol}) failed:`, err);
    if (fallback > 0) {
      // Cache the fallback briefly so we don't spam the API on every request
      priceCache.set(symbol, { price: fallback, timestamp: Date.now() });
    }
    return fallback;
  }
}

/**
 * Batch-fetch current prices for multiple stock symbols in a single request.
 * Returns a Map of symbol → price.  Symbols absent from the response (API
 * error, delisted, etc.) are omitted from the map and callers should fall back
 * to avg_price.
 */
export async function getBatchStockPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  const toFetch: string[] = [];

  // Serve from cache where possible
  for (const sym of symbols) {
    const cached = priceCache.get(sym);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      result.set(sym, cached.price);
    } else {
      toFetch.push(sym);
    }
  }

  if (toFetch.length === 0) return result;

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

      if (sym && price !== null && isFinite(price) && price > 0) {
        priceCache.set(sym, { price, timestamp: Date.now() });
        result.set(sym, price);
      }
    }
  } catch (err) {
    console.error("[marketData] getBatchStockPrices failed:", err);
    // Callers handle missing entries via fallback logic
  }

  return result;
}
