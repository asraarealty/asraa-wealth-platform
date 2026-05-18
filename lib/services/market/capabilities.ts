import { ApiError, fetcher } from "@/lib/fetcher";

export interface MarketCapabilities {
  stockQuotes: boolean;
  bulkQuotes: boolean;
  mfNav: boolean;
  commodityPricing: boolean;
  realtimeStreaming: boolean;
  aiIntelligence: boolean;
  exports: boolean;
  checkedAt: string;
}

const CAPABILITIES_FRESH_MS = 5 * 60 * 1000;

const DEFAULT_CAPABILITIES: MarketCapabilities = {
  stockQuotes: false,
  bulkQuotes: false,
  mfNav: true,
  commodityPricing: true,
  realtimeStreaming: false,
  aiIntelligence: true,
  exports: true,
  checkedAt: new Date(0).toISOString(),
};

let cachedCapabilities: MarketCapabilities | null = null;
let cachedAt = 0;
let inflightCapabilities: Promise<MarketCapabilities> | null = null;

/**
 * Returns true when the endpoint is reachable but failed for operational reasons
 * (auth, rate limit, validation), and false when the endpoint is unavailable.
 */
function endpointSupported(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.status === 405 || error.status === 501) return false;
    return true;
  }
  return false;
}

async function probe(call: () => Promise<unknown>): Promise<boolean> {
  try {
    await call();
    return true;
  } catch (error) {
    return endpointSupported(error);
  }
}

async function detectCapabilities(): Promise<MarketCapabilities> {
  const [stockQuotes, bulkQuotes, mfNav, commodityPricing] = await Promise.all([
    probe(() =>
      fetcher(`/stocks/v2/${encodeURIComponent("INFY")}`, {
        raw: true,
        noRedirectOn401: true,
        cache: "no-store",
      })
    ),
    probe(() =>
      fetcher("/stocks/v2/bulk", {
        method: "POST",
        body: { symbols: ["INFY"] },
        raw: true,
        noRedirectOn401: true,
        cache: "no-store",
      })
    ),
    probe(() =>
      fetcher(`/mutual-funds/search?q=${encodeURIComponent("INFY")}`, {
        raw: true,
        noRedirectOn401: true,
        cache: "no-store",
      })
    ),
    probe(() =>
      fetcher(`/commodities/search?q=${encodeURIComponent("GOLD")}`, {
        raw: true,
        noRedirectOn401: true,
        cache: "no-store",
      })
    ),
  ]);

  return {
    ...DEFAULT_CAPABILITIES,
    stockQuotes,
    bulkQuotes,
    mfNav,
    commodityPricing,
    checkedAt: new Date().toISOString(),
  };
}

export async function getMarketCapabilities(options: {
  forceRefresh?: boolean;
  staleWhileRevalidate?: boolean;
} = {}): Promise<MarketCapabilities> {
  const now = Date.now();
  const fresh = cachedCapabilities && now - cachedAt < CAPABILITIES_FRESH_MS;

  if (!options.forceRefresh && fresh && cachedCapabilities) {
    return cachedCapabilities;
  }

  if (!options.forceRefresh && options.staleWhileRevalidate && cachedCapabilities) {
    if (!inflightCapabilities) {
      inflightCapabilities = detectCapabilities()
        .then((next) => {
          cachedCapabilities = next;
          cachedAt = Date.now();
          return next;
        })
        .finally(() => {
          inflightCapabilities = null;
        });
    }
    return cachedCapabilities;
  }

  if (!inflightCapabilities) {
    inflightCapabilities = detectCapabilities()
      .then((next) => {
        cachedCapabilities = next;
        cachedAt = Date.now();
        return next;
      })
      .finally(() => {
        inflightCapabilities = null;
      });
  }

  try {
    return await inflightCapabilities;
  } catch {
    return cachedCapabilities ?? {
      ...DEFAULT_CAPABILITIES,
      checkedAt: new Date().toISOString(),
    };
  }
}
