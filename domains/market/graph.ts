"use client";

import { useEffect, useSyncExternalStore } from "react";
import { fetcher, toErrorMessage } from "@/lib/fetcher";
import { boundRefreshInterval } from "@/domains/market/cache";
import { fetchBulkQuotes } from "@/domains/market/quotes";
import { deriveMarketCollections } from "@/domains/market/breadth";
import { cancelDebouncedMarketSearch, searchMarketDebounced } from "@/domains/market/search";
import { getWatchlistSymbols, toggleWatchlistSymbol } from "@/domains/market/watchlist";
import {
  EMPTY_BREADTH,
  EMPTY_SEARCH_GROUPS,
  type MarketAsset,
  type MarketAssetKind,
  type MarketSnapshot,
} from "@/domains/market/types";

export type { MarketAsset, MarketSnapshot };

type StockSeed = {
  symbol: string;
  name: string;
  kind: Exclude<MarketAssetKind, "mutual-fund" | "commodity" | "metal">;
  market: MarketAsset["market"];
  sector: string;
  category: string;
  currency: MarketAsset["currency"];
};

type CommoditySeed = {
  query: string;
  symbol: string;
  name: string;
  kind: Extract<MarketAssetKind, "commodity" | "metal">;
  category: string;
};

type MutualFundSeed = {
  query: string;
  symbol: string;
  name: string;
  category: string;
};

const MARKET_REFRESH_INTERVAL_MS = boundRefreshInterval(45_000, 30_000, 60_000);
const MARKET_STALE_MS = 40_000;
const SEARCH_MIN_QUERY_LENGTH = 2;

const STOCK_UNIVERSE: StockSeed[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", kind: "stock", market: "India", sector: "Energy", category: "Large Cap", currency: "INR" },
  { symbol: "TCS", name: "Tata Consultancy Services", kind: "stock", market: "India", sector: "Technology", category: "Large Cap", currency: "INR" },
  { symbol: "INFY", name: "Infosys", kind: "stock", market: "India", sector: "Technology", category: "Large Cap", currency: "INR" },
  { symbol: "HDFCBANK", name: "HDFC Bank", kind: "stock", market: "India", sector: "Financials", category: "Bank", currency: "INR" },
  { symbol: "ICICIBANK", name: "ICICI Bank", kind: "stock", market: "India", sector: "Financials", category: "Bank", currency: "INR" },
  { symbol: "LT", name: "Larsen & Toubro", kind: "stock", market: "India", sector: "Industrials", category: "Infrastructure", currency: "INR" },
  { symbol: "ITC", name: "ITC", kind: "stock", market: "India", sector: "Consumer", category: "FMCG", currency: "INR" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", kind: "stock", market: "India", sector: "Telecom", category: "Large Cap", currency: "INR" },
  { symbol: "AAPL", name: "Apple", kind: "global-stock", market: "Global", sector: "Technology", category: "Mega Cap", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft", kind: "global-stock", market: "Global", sector: "Technology", category: "Mega Cap", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA", kind: "global-stock", market: "Global", sector: "Technology", category: "AI", currency: "USD" },
  { symbol: "AMZN", name: "Amazon", kind: "global-stock", market: "Global", sector: "Consumer", category: "Mega Cap", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet", kind: "global-stock", market: "Global", sector: "Communication", category: "Mega Cap", currency: "USD" },
  { symbol: "TSLA", name: "Tesla", kind: "global-stock", market: "Global", sector: "Auto", category: "EV", currency: "USD" },
  { symbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", kind: "etf", market: "India", sector: "Index", category: "ETF", currency: "INR" },
  { symbol: "GOLDBEES", name: "Gold BeES ETF", kind: "etf", market: "India", sector: "Commodity", category: "ETF", currency: "INR" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", kind: "etf", market: "Global", sector: "Index", category: "ETF", currency: "USD" },
  { symbol: "QQQ", name: "Invesco QQQ", kind: "etf", market: "Global", sector: "Technology", category: "ETF", currency: "USD" },
  { symbol: "^NSEI", name: "NIFTY 50", kind: "index", market: "Macro", sector: "Indices", category: "Index", currency: "INR" },
  { symbol: "^BSESN", name: "SENSEX", kind: "index", market: "Macro", sector: "Indices", category: "Index", currency: "INR" },
  { symbol: "^NSEBANK", name: "BANKNIFTY", kind: "index", market: "Macro", sector: "Indices", category: "Index", currency: "INR" },
  { symbol: "USDINR=X", name: "USD/INR", kind: "forex", market: "Macro", sector: "FX", category: "Forex", currency: "INR" },
];

const COMMODITY_UNIVERSE: CommoditySeed[] = [
  { query: "GOLD", symbol: "GOLD", name: "Gold", kind: "metal", category: "Precious Metal" },
  { query: "SILVER", symbol: "SILVER", name: "Silver", kind: "metal", category: "Precious Metal" },
  { query: "CRUDE", symbol: "CRUDE", name: "Crude Oil", kind: "commodity", category: "Energy" },
  { query: "NATURAL GAS", symbol: "NATGAS", name: "Natural Gas", kind: "commodity", category: "Energy" },
];

const MUTUAL_FUND_UNIVERSE: MutualFundSeed[] = [
  { query: "Parag Parikh Flexi Cap", symbol: "PPFCF", name: "Parag Parikh Flexi Cap Fund", category: "Flexi Cap" },
  { query: "SBI Small Cap", symbol: "SBISMALL", name: "SBI Small Cap Fund", category: "Small Cap" },
  { query: "HDFC Index Sensex", symbol: "HDFCSENSEX", name: "HDFC Index Sensex Fund", category: "Index Fund" },
  { query: "ICICI Prudential Bluechip", symbol: "ICICIBLUE", name: "ICICI Prudential Bluechip Fund", category: "Large Cap" },
];

const ADMIN_TICKERS = ["^NSEI", "^BSESN", "^NSEBANK", "GOLD", "USDINR=X"];

let snapshot: MarketSnapshot = {
  isLoading: true,
  isRefreshing: false,
  error: null,
  lastUpdated: null,
  assets: [],
  marketOverview: [],
  topGainers: [],
  topLosers: [],
  trendingAssets: [],
  watchlist: [],
  sectorMovers: [],
  adminTickers: [],
  breadth: EMPTY_BREADTH,
  search: {
    query: "",
    isSearching: false,
    error: null,
    groups: EMPTY_SEARCH_GROUPS,
  },
};

const listeners = new Set<() => void>();
const commodityJobs = new Map<string, Promise<MarketAsset | null>>();
const fundJobs = new Map<string, Promise<MarketAsset | null>>();
let refreshJob: Promise<MarketAsset[]> | null = null;
let pollHandle: ReturnType<typeof setInterval> | null = null;
let lastRefreshAt = 0;
let lastRefreshMessage: string | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Partial<MarketSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrapPayload(value: unknown): unknown {
  const record = safeRecord(value);
  if (record.data && typeof record.data === "object" && "data" in safeRecord(record.data)) {
    return safeRecord(record.data).data;
  }
  if ("data" in record) return record.data;
  return value;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function s(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function marketId(kind: MarketAssetKind, symbol: string) {
  return `${kind}:${symbol.toUpperCase()}`;
}

function seedNumber(input: string) {
  return Array.from(input).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
}

function buildSparkline(symbol: string, price: number, changePercent: number): number[] {
  const seed = seedNumber(symbol);
  const anchor = price > 0 ? price : 100;
  return Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin((index + 1 + seed / 17) * 0.8) * (anchor * 0.01);
    const drift = ((index - 5.5) / 10) * ((changePercent / 100) * anchor * 0.9);
    return Number((anchor - drift + wave).toFixed(2));
  });
}

function dedupeAssets(items: MarketAsset[]): MarketAsset[] {
  const seen = new Map<string, MarketAsset>();
  for (const item of items) {
    const existing = seen.get(item.id);
    if (!existing || Math.abs(item.changePercent) > Math.abs(existing.changePercent)) {
      seen.set(item.id, item);
    }
  }
  return [...seen.values()];
}

function mapStockQuote(seed: StockSeed, quote: { symbol: string; name: string; price: number; change: number; changePercent: number; volume: number; marketCap: number }): MarketAsset {
  return {
    id: marketId(seed.kind, quote.symbol || seed.symbol),
    symbol: s(quote.symbol, seed.symbol),
    name: s(quote.name, seed.name),
    kind: seed.kind,
    market: seed.market,
    sector: seed.sector,
    category: seed.category,
    price: n(quote.price),
    change: n(quote.change),
    changePercent: n(quote.changePercent),
    volume: n(quote.volume),
    marketCap: n(quote.marketCap),
    currency: seed.currency,
    sparkline: buildSparkline(seed.symbol, n(quote.price, 100), n(quote.changePercent)),
    lastUpdated: new Date().toISOString(),
  };
}

async function fetchBulkStockUniverse(): Promise<MarketAsset[]> {
  const symbols = STOCK_UNIVERSE.map((item) => item.symbol);
  const map = await fetchBulkQuotes(symbols, { preservePreviousData: true });

  return STOCK_UNIVERSE.map((seed) =>
    mapStockQuote(seed, map.get(seed.symbol.toUpperCase()) ?? {
      symbol: seed.symbol,
      name: seed.name,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      marketCap: 0,
    })
  );
}

function parseCommodityResult(seed: CommoditySeed, payload: unknown): MarketAsset | null {
  const unwrapped = unwrapPayload(payload);
  const candidates = asArray<Record<string, unknown>>(unwrapped).length > 0
    ? asArray<Record<string, unknown>>(unwrapped)
    : [safeRecord(unwrapped)];
  const result = candidates.find((item) => Object.keys(item).length > 0);
  if (!result) return null;

  const price = n(result.price ?? result.ltp ?? result.last_price ?? result.current_price ?? result.close);
  const change = n(result.change ?? result.price_change ?? result.net_change);
  const changePercent = n(result.changePercent ?? result.change_percent ?? result.percent_change);
  const symbol = s(result.symbol ?? result.code, seed.symbol);

  return {
    id: marketId(seed.kind, symbol),
    symbol,
    name: s(result.name, seed.name),
    kind: seed.kind,
    market: "Commodity",
    sector: seed.category,
    category: seed.category,
    price,
    change,
    changePercent,
    volume: n(result.volume),
    marketCap: 0,
    currency: "INR",
    sparkline: buildSparkline(symbol, price, changePercent),
    lastUpdated: new Date().toISOString(),
  };
}

async function fetchCommodity(seed: CommoditySeed): Promise<MarketAsset | null> {
  const existing = commodityJobs.get(seed.query);
  if (existing) return existing;

  const job = fetcher<unknown>(`/commodities/search?q=${encodeURIComponent(seed.query)}`, {
    raw: true,
    noRedirectOn401: true,
    cache: "no-store",
  }).then((payload) => parseCommodityResult(seed, payload));

  commodityJobs.set(seed.query, job);
  try {
    return await job;
  } finally {
    commodityJobs.delete(seed.query);
  }
}

function mapFundResult(seed: MutualFundSeed, result: Record<string, unknown> | undefined): MarketAsset {
  const nav = n(result?.nav);
  return {
    id: marketId("mutual-fund", s(result?.code, seed.symbol)),
    symbol: s(result?.code, seed.symbol),
    name: s(result?.name, seed.name),
    kind: "mutual-fund",
    market: "Fund",
    sector: s(result?.category, seed.category),
    category: s(result?.category, seed.category),
    price: nav,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: 0,
    currency: "INR",
    sparkline: buildSparkline(s(result?.code, seed.symbol), nav || 100, 0.4),
    lastUpdated: new Date().toISOString(),
    searchLabel: s(result?.fundHouse ?? result?.fund_house),
  };
}

async function fetchMutualFund(seed: MutualFundSeed): Promise<MarketAsset | null> {
  const existing = fundJobs.get(seed.query);
  if (existing) return existing;

  const job = fetcher<unknown>(`/mutual-funds/search?q=${encodeURIComponent(seed.query)}`, {
    raw: true,
    noRedirectOn401: true,
    cache: "no-store",
  })
    .then((payload) => {
      const list = asArray<Record<string, unknown>>(unwrapPayload(payload));
      return mapFundResult(seed, list[0]);
    })
    .catch(() => null);

  fundJobs.set(seed.query, job);
  try {
    return await job;
  } finally {
    fundJobs.delete(seed.query);
  }
}

async function refreshMarketUniverse(force = false): Promise<MarketAsset[]> {
  if (!force && refreshJob) return refreshJob;
  if (!force && Date.now() - lastRefreshAt < MARKET_STALE_MS && snapshot.assets.length > 0) {
    return snapshot.assets;
  }

  const job: Promise<MarketAsset[]> = Promise.allSettled([
    fetchBulkStockUniverse(),
    Promise.all(COMMODITY_UNIVERSE.map((seed) => fetchCommodity(seed))),
    Promise.all(MUTUAL_FUND_UNIVERSE.map((seed) => fetchMutualFund(seed))),
  ])
    .then(([stocksResult, commoditiesResult, mutualFundsResult]) => {
      const previous = snapshot.assets;
      const previousStocks = previous.filter((asset) =>
        ["stock", "global-stock", "etf", "index", "forex"].includes(asset.kind)
      );
      const previousCommodities = previous.filter((asset) =>
        ["commodity", "metal"].includes(asset.kind)
      );
      const previousFunds = previous.filter((asset) => asset.kind === "mutual-fund");

      const stocks = stocksResult.status === "fulfilled" ? stocksResult.value : previousStocks;
      const commodities =
        commoditiesResult.status === "fulfilled"
          ? commoditiesResult.value.filter(Boolean)
          : previousCommodities;
      const mutualFunds =
        mutualFundsResult.status === "fulfilled"
          ? mutualFundsResult.value.filter(Boolean)
          : previousFunds;

      const failedAreas = [
        stocksResult.status === "rejected" ? "stocks" : null,
        commoditiesResult.status === "rejected" ? "commodities" : null,
        mutualFundsResult.status === "rejected" ? "mutual funds" : null,
      ].filter(Boolean) as string[];

      lastRefreshMessage =
        failedAreas.length > 0
          ? `Partial market sync: ${failedAreas.join(", ")} unavailable; showing last known values.`
          : null;

      const combined = dedupeAssets([
        ...stocks,
        ...commodities,
        ...mutualFunds,
      ] as MarketAsset[]);

      lastRefreshAt = Date.now();
      return combined.length > 0 ? combined : previous;
    })
    .finally(() => {
      refreshJob = null;
    });

  refreshJob = job;
  return job;
}

function startPolling() {
  if (pollHandle) return;
  pollHandle = setInterval(() => {
    void ensureMarketData({ force: true, silent: true });
  }, MARKET_REFRESH_INTERVAL_MS);
}

function stopPolling() {
  if (!pollHandle) return;
  clearInterval(pollHandle);
  pollHandle = null;
}

export async function ensureMarketData(options: { force?: boolean; silent?: boolean } = {}) {
  const { force = false, silent = false } = options;
  if (!silent && !snapshot.isLoading && !snapshot.isRefreshing) {
    setSnapshot({
      isLoading: snapshot.assets.length === 0,
      isRefreshing: snapshot.assets.length > 0,
      error: null,
    });
  }

  try {
    const assets = await refreshMarketUniverse(force);
    const collections = deriveMarketCollections(assets, {
      watchlistSymbols: getWatchlistSymbols(),
      adminTickers: ADMIN_TICKERS,
    });

    setSnapshot({
      isLoading: false,
      isRefreshing: false,
      error: lastRefreshMessage,
      lastUpdated: new Date().toISOString(),
      assets,
      ...collections,
    });
    return assets;
  } catch (error) {
    setSnapshot({
      isLoading: false,
      isRefreshing: false,
      error: toErrorMessage(error),
    });
    return snapshot.assets;
  }
}

export async function searchMarket(query: string) {
  const normalized = query.trim();
  if (!normalized || normalized.length < SEARCH_MIN_QUERY_LENGTH) {
    cancelDebouncedMarketSearch();
    setSnapshot({
      search: {
        query: normalized,
        isSearching: false,
        error: null,
        groups: EMPTY_SEARCH_GROUPS,
      },
    });
    return;
  }

  setSnapshot({
    search: {
      ...snapshot.search,
      query: normalized,
      isSearching: true,
      error: null,
    },
  });

  try {
    const groups = await searchMarketDebounced(normalized, {
      delayMs: 250,
      watchlistSymbols: getWatchlistSymbols(),
      watchlistAssets: snapshot.watchlist,
    });
    setSnapshot({
      search: {
        query: normalized,
        isSearching: false,
        error: null,
        groups,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    setSnapshot({
      search: {
        query: normalized,
        isSearching: false,
        error: toErrorMessage(error),
        groups: EMPTY_SEARCH_GROUPS,
      },
    });
  }
}

export function toggleWatchlist(symbol: string) {
  const nextSymbols = toggleWatchlistSymbol(symbol, getWatchlistSymbols());
  const collections = deriveMarketCollections(snapshot.assets, {
    watchlistSymbols: nextSymbols,
    adminTickers: ADMIN_TICKERS,
  });
  setSnapshot({ ...collections });
}

export function subscribeMarket(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) startPolling();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopPolling();
  };
}

export function getMarketSnapshot() {
  return snapshot;
}

function formatMoney(value: number, currency: "INR" | "USD") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function useMarketDomainGraph() {
  const state = useSyncExternalStore(subscribeMarket, getMarketSnapshot, getMarketSnapshot);

  useEffect(() => {
    if (typeof performance !== "undefined" && typeof performance.mark === "function") {
      performance.mark("market:mount:start");
    }

    void ensureMarketData({ silent: snapshot.assets.length > 0 }).finally(() => {
      if (typeof performance !== "undefined" && typeof performance.mark === "function") {
        performance.mark("market:mount:end");
        try {
          performance.measure("market:mount", "market:mount:start", "market:mount:end");
        } catch {
          // Ignore duplicate-mark measurement errors in strict/dev remount cycles.
        }
      }
    });
  }, []);

  return {
    ...state,
    refresh: () => ensureMarketData({ force: true }),
    searchMarket,
    setSearchQuery: searchMarket,
    toggleWatchlist,
    formatMoney,
  };
}
