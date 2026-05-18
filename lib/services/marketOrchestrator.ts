"use client";

import { useEffect, useSyncExternalStore } from "react";
import { fetcher, toErrorMessage } from "@/lib/fetcher";
import { searchMutualFunds, searchStocks, type MutualFundResult, type StockQuote } from "@/lib/api";

export type MarketAssetKind =
  | "stock"
  | "global-stock"
  | "etf"
  | "mutual-fund"
  | "commodity"
  | "index"
  | "forex"
  | "metal";

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  kind: MarketAssetKind;
  market: "India" | "Global" | "Fund" | "Commodity" | "Macro";
  sector: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  currency: "INR" | "USD";
  sparkline: number[];
  lastUpdated: string;
  searchLabel?: string;
}

export interface MarketOverviewMetric {
  label: string;
  value: string;
  delta: string;
  tone: "success" | "warn" | "neutral";
}

export interface SectorMover {
  sector: string;
  avgChangePercent: number;
  leaders: string[];
}

export interface UnifiedSearchGroups {
  stocks: MarketAsset[];
  mutualFunds: MarketAsset[];
  commodities: MarketAsset[];
}

export interface MarketSnapshot {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
  assets: MarketAsset[];
  marketOverview: MarketOverviewMetric[];
  topGainers: MarketAsset[];
  topLosers: MarketAsset[];
  trendingAssets: MarketAsset[];
  watchlist: MarketAsset[];
  sectorMovers: SectorMover[];
  adminTickers: MarketAsset[];
  search: {
    query: string;
    isSearching: boolean;
    error: string | null;
    groups: UnifiedSearchGroups;
  };
}

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

const MARKET_REFRESH_INTERVAL_MS = 45_000;
const MARKET_STALE_MS = 40_000;
const SEARCH_FRESH_MS = 30_000;
const SEARCH_MIN_QUERY_LENGTH = 3;
const WATCHLIST_STORAGE_KEY = "asraa.market.watchlist";

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

const DEFAULT_WATCHLIST = ["RELIANCE", "INFY", "AAPL", "GOLD", "PPFCF"];
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
  search: {
    query: "",
    isSearching: false,
    error: null,
    groups: { stocks: [], mutualFunds: [], commodities: [] },
  },
};

const listeners = new Set<() => void>();
const searchJobs = new Map<string, Promise<UnifiedSearchGroups>>();
const searchCache = new Map<string, { data: UnifiedSearchGroups; updatedAt: number }>();
const commodityJobs = new Map<string, Promise<MarketAsset | null>>();
const fundJobs = new Map<string, Promise<MarketAsset | null>>();
let refreshJob: Promise<MarketAsset[]> | null = null;
let pollHandle: ReturnType<typeof setInterval> | null = null;
let lastRefreshAt = 0;
let searchAbortController: AbortController | null = null;

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

function tone(changePercent: number): "success" | "warn" | "neutral" {
  if (changePercent > 0) return "success";
  if (changePercent < 0) return "warn";
  return "neutral";
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

function formatMoney(value: number, currency: "INR" | "USD") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
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

function getWatchlistSymbols() {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST;
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map((item) => String(item).toUpperCase())
      : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function persistWatchlist(symbols: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify([...new Set(symbols.map((item) => item.toUpperCase()))]));
}

function parseStockQuote(seed: StockSeed, quote: Record<string, unknown>): MarketAsset {
  const price = n(quote.price ?? quote.ltp ?? quote.regularMarketPrice ?? quote.last_price);
  const change = n(quote.change ?? quote.regularMarketChange);
  const changePercent = n(quote.changePercent ?? quote.regularMarketChangePercent);
  const symbol = s(quote.symbol, seed.symbol);
  const name = s(quote.name, seed.name);

  return {
    id: marketId(seed.kind, symbol),
    symbol,
    name,
    kind: seed.kind,
    market: seed.market,
    sector: seed.sector,
    category: seed.category,
    price,
    change,
    changePercent,
    volume: n(quote.volume ?? quote.regularMarketVolume),
    marketCap: n(quote.marketCap),
    currency: seed.currency,
    sparkline: buildSparkline(symbol, price, changePercent),
    lastUpdated: new Date().toISOString(),
  };
}

function parseStockBulkResponse(payload: unknown): Record<string, Record<string, unknown>> {
  const quotes: Record<string, Record<string, unknown>> = {};
  const queue: unknown[] = [unwrapPayload(payload)];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    if (typeof current !== "object") continue;
    const record = current as Record<string, unknown>;
    const symbol = s(record.symbol ?? record.ticker ?? record.code);
    if (symbol) quotes[symbol.toUpperCase()] = record;

    Object.values(record).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }

  return quotes;
}

async function fetchBulkStockUniverse(): Promise<MarketAsset[]> {
  const symbols = STOCK_UNIVERSE.map((item) => item.symbol);
  const payload = await fetcher<unknown>("/stocks/v2/bulk", {
    method: "POST",
    body: { symbols },
    raw: true,
    noRedirectOn401: true,
    cache: "no-store",
  });

  const quoteMap = parseStockBulkResponse(payload);
  return STOCK_UNIVERSE.map((seed) => parseStockQuote(seed, quoteMap[seed.symbol.toUpperCase()] ?? {}));
}

function parseCommodityResult(seed: CommoditySeed, payload: unknown): MarketAsset | null {
  const candidates = asArray<Record<string, unknown>>(unwrapPayload(payload)).length > 0
    ? asArray<Record<string, unknown>>(unwrapPayload(payload))
    : [safeRecord(unwrapPayload(payload))];
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
    market: seed.kind === "metal" ? "Commodity" : "Commodity",
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

function mapFundResult(seed: MutualFundSeed, result: MutualFundResult | undefined): MarketAsset {
  const nav = n(result?.nav);
  return {
    id: marketId("mutual-fund", result?.code ?? seed.symbol),
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
    sparkline: buildSparkline(result?.code ?? seed.symbol, nav || 100, 0.4),
    lastUpdated: new Date().toISOString(),
    searchLabel: result?.fundHouse ?? result?.fund_house,
  };
}

async function fetchMutualFund(seed: MutualFundSeed): Promise<MarketAsset | null> {
  const existing = fundJobs.get(seed.query);
  if (existing) return existing;

  const job = searchMutualFunds(seed.query)
    .then((results) => mapFundResult(seed, results[0]))
    .catch(() => null);

  fundJobs.set(seed.query, job);
  try {
    return await job;
  } finally {
    fundJobs.delete(seed.query);
  }
}

function buildOverview(items: MarketAsset[]): MarketOverviewMetric[] {
  const equities = items.filter((item) => ["stock", "global-stock", "etf", "index"].includes(item.kind));
  const positive = equities.filter((item) => item.changePercent > 0).length;
  const negative = equities.filter((item) => item.changePercent < 0).length;
  const avgIndian = average(items.filter((item) => item.market === "India").map((item) => item.changePercent));
  const avgGlobal = average(items.filter((item) => item.market === "Global").map((item) => item.changePercent));
  const avgCommodities = average(items.filter((item) => item.market === "Commodity").map((item) => item.changePercent));

  return [
    {
      label: "Indian pulse",
      value: `${avgIndian >= 0 ? "+" : ""}${avgIndian.toFixed(2)}%`,
      delta: `${positive} advancing / ${negative} declining`,
      tone: tone(avgIndian),
    },
    {
      label: "Global pulse",
      value: `${avgGlobal >= 0 ? "+" : ""}${avgGlobal.toFixed(2)}%`,
      delta: `${items.filter((item) => item.market === "Global").length} global leaders`,
      tone: tone(avgGlobal),
    },
    {
      label: "Commodity pulse",
      value: `${avgCommodities >= 0 ? "+" : ""}${avgCommodities.toFixed(2)}%`,
      delta: `${items.filter((item) => item.market === "Commodity").length} tracked contracts`,
      tone: tone(avgCommodities),
    },
    {
      label: "Live breadth",
      value: `${positive}/${Math.max(equities.length, 1)}`,
      delta: "Advancers across liquid universe",
      tone: positive >= negative ? "success" : "warn",
    },
  ];
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSectorMovers(items: MarketAsset[]): SectorMover[] {
  const bySector = new Map<string, MarketAsset[]>();
  items
    .filter((item) => ["stock", "global-stock", "etf"].includes(item.kind))
    .forEach((item) => {
      const key = item.sector || "Other";
      const existing = bySector.get(key) ?? [];
      existing.push(item);
      bySector.set(key, existing);
    });

  return [...bySector.entries()]
    .map(([sector, sectorItems]) => ({
      sector,
      avgChangePercent: average(sectorItems.map((item) => item.changePercent)),
      leaders: [...sectorItems]
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 3)
        .map((item) => item.symbol),
    }))
    .sort((a, b) => Math.abs(b.avgChangePercent) - Math.abs(a.avgChangePercent))
    .slice(0, 6);
}

function deriveCollections(items: MarketAsset[]) {
  const liquid = items.filter((item) => item.kind !== "mutual-fund");
  const watchlistSymbols = getWatchlistSymbols();
  const topGainers = [...liquid].sort((a, b) => b.changePercent - a.changePercent).slice(0, 6);
  const topLosers = [...liquid].sort((a, b) => a.changePercent - b.changePercent).slice(0, 6);
  const trendingAssets = [...items]
    .sort((a, b) => Math.abs(b.changePercent) + b.volume / 1_000_000 - (Math.abs(a.changePercent) + a.volume / 1_000_000))
    .slice(0, 8);
  const watchlist = watchlistSymbols
    .map((symbol) => items.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()))
    .filter(Boolean) as MarketAsset[];
  const adminTickers = ADMIN_TICKERS
    .map((symbol) => items.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()))
    .filter(Boolean) as MarketAsset[];

  return {
    marketOverview: buildOverview(items),
    topGainers,
    topLosers,
    trendingAssets,
    watchlist,
    sectorMovers: buildSectorMovers(items),
    adminTickers,
  };
}

async function refreshMarketUniverse(force = false): Promise<MarketAsset[]> {
  if (!force && refreshJob) return refreshJob;
  if (!force && Date.now() - lastRefreshAt < MARKET_STALE_MS && snapshot.assets.length > 0) {
    return snapshot.assets;
  }

  const job: Promise<MarketAsset[]> = Promise.all([
    fetchBulkStockUniverse(),
    Promise.all(COMMODITY_UNIVERSE.map((seed) => fetchCommodity(seed))),
    Promise.all(MUTUAL_FUND_UNIVERSE.map((seed) => fetchMutualFund(seed))),
  ])
    .then(([stocks, commodities, mutualFunds]) => {
      const combined = dedupeAssets([
        ...stocks,
        ...commodities.filter(Boolean),
        ...mutualFunds.filter(Boolean),
      ] as MarketAsset[]);
      lastRefreshAt = Date.now();
      return combined;
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
    setSnapshot({
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastUpdated: new Date().toISOString(),
      assets,
      ...deriveCollections(assets),
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

async function searchCommodities(query: string, signal?: AbortSignal): Promise<MarketAsset[]> {
  const payload = await fetcher<unknown>(`/commodities/search?q=${encodeURIComponent(query)}`, {
    raw: true,
    noRedirectOn401: true,
    cache: "no-store",
    signal,
  });

  return asArray<Record<string, unknown>>(unwrapPayload(payload)).slice(0, 6).map((item, index) => {
    const symbol = s(item.symbol ?? item.code, `CMD-${index}`);
    const price = n(item.price ?? item.ltp ?? item.last_price ?? item.current_price);
    const change = n(item.change ?? item.price_change ?? item.net_change);
    const changePercent = n(item.changePercent ?? item.change_percent ?? item.percent_change);

    return {
      id: marketId("commodity", symbol),
      symbol,
      name: s(item.name, symbol),
      kind: ["gold", "silver"].includes(symbol.toLowerCase()) ? "metal" : "commodity",
      market: "Commodity",
      sector: s(item.category ?? item.segment, "Commodity"),
      category: s(item.category ?? item.segment, "Commodity"),
      price,
      change,
      changePercent,
      volume: n(item.volume),
      marketCap: 0,
      currency: "INR",
      sparkline: buildSparkline(symbol, price || 100, changePercent),
      lastUpdated: new Date().toISOString(),
      searchLabel: s(item.exchange),
    };
  });
}

async function searchUnifiedGroups(query: string, signal?: AbortSignal): Promise<UnifiedSearchGroups> {
  const key = query.trim().toLowerCase();
  if (!key) return { stocks: [], mutualFunds: [], commodities: [] };

  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.updatedAt < SEARCH_FRESH_MS) {
    return cached.data;
  }

  const existing = searchJobs.get(key);
  if (existing) return existing;

  const job: Promise<UnifiedSearchGroups> = Promise.all([
    searchStocks(query, signal),
    searchMutualFunds(query, signal),
    searchCommodities(query, signal),
  ]).then(([stocks, mutualFunds, commodities]) => ({
    stocks: stocks.slice(0, 8).map((item: StockQuote) => ({
      id: marketId("stock", item.symbol),
      symbol: item.symbol,
      name: item.name,
      kind: (/ETF/i.test(item.name) ? "etf" : item.symbol.includes("=") ? "forex" : "stock") as MarketAssetKind,
      market: (item.symbol.endsWith(".NS") || item.symbol.endsWith(".BO") ? "India" : "Global") as MarketAsset["market"],
      sector: /ETF/i.test(item.name) ? "ETF" : "Equity",
      category: /ETF/i.test(item.name) ? "ETF" : "Stock",
      price: n(item.price),
      change: n(item.change),
      changePercent: n(item.changePercent),
      volume: n(item.volume),
      marketCap: n(item.marketCap),
      currency: (item.symbol.endsWith(".NS") || item.symbol.endsWith(".BO") ? "INR" : "USD") as MarketAsset["currency"],
      sparkline: buildSparkline(item.symbol, n(item.price, 100), n(item.changePercent)),
      lastUpdated: new Date().toISOString(),
    })) as MarketAsset[],
    mutualFunds: mutualFunds.slice(0, 6).map((item) => ({
      id: marketId("mutual-fund", item.code),
      symbol: item.code,
      name: item.name,
      kind: "mutual-fund",
      market: "Fund",
      sector: s(item.category, "Mutual Fund"),
      category: s(item.category, "Mutual Fund"),
      price: n(item.nav),
      change: 0,
      changePercent: 0,
      volume: 0,
      marketCap: 0,
      currency: "INR",
      sparkline: buildSparkline(item.code, n(item.nav, 100), 0.2),
      lastUpdated: new Date().toISOString(),
      searchLabel: item.fundHouse ?? item.fund_house,
    })) as MarketAsset[],
    commodities,
  }))
    .then((result) => {
      searchCache.set(key, { data: result, updatedAt: Date.now() });
      return result;
    })
    .finally(() => {
      searchJobs.delete(key);
    });

  searchJobs.set(key, job);
  return job;
}

export async function searchMarket(query: string) {
  const normalized = query.trim();
  if (!normalized || normalized.length < SEARCH_MIN_QUERY_LENGTH) {
    searchAbortController?.abort();
    searchAbortController = null;
    setSnapshot({
      search: {
        query: normalized,
        isSearching: false,
        error: null,
        groups: { stocks: [], mutualFunds: [], commodities: [] },
      },
    });
    return;
  }

  if (
    snapshot.search.query.toLowerCase() === normalized.toLowerCase() &&
    !snapshot.search.isSearching &&
    (snapshot.search.groups.stocks.length > 0 ||
      snapshot.search.groups.mutualFunds.length > 0 ||
      snapshot.search.groups.commodities.length > 0)
  ) {
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

  searchAbortController?.abort();
  const controller = new AbortController();
  searchAbortController = controller;

  try {
    const groups = await searchUnifiedGroups(normalized, controller.signal);
    if (searchAbortController !== controller) return;
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
    if (searchAbortController !== controller) return;
    setSnapshot({
      search: {
        query: normalized,
        isSearching: false,
        error: toErrorMessage(error),
        groups: { stocks: [], mutualFunds: [], commodities: [] },
      },
    });
  } finally {
    if (searchAbortController === controller) searchAbortController = null;
  }
}

export function toggleWatchlist(symbol: string) {
  const normalized = symbol.toUpperCase();
  const current = getWatchlistSymbols();
  const next = current.includes(normalized)
    ? current.filter((item) => item !== normalized)
    : [...current, normalized];
  persistWatchlist(next);
  setSnapshot({ ...deriveCollections(snapshot.assets) });
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

export function useMarketOrchestrator() {
  const state = useSyncExternalStore(subscribeMarket, getMarketSnapshot, getMarketSnapshot);

  useEffect(() => {
    void ensureMarketData({ silent: snapshot.assets.length > 0 });
  }, []);

  return {
    ...state,
    refresh: () => ensureMarketData({ force: true }),
    searchMarket,
    toggleWatchlist,
    formatMoney,
  };
}
