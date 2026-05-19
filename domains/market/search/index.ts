"use client";

import { fetcher } from "@/lib/fetcher";
import { createRequestCache } from "@/domains/market/cache";
import {
  EMPTY_SEARCH_GROUPS,
  type CommandSearchItem,
  type MarketAsset,
  type MarketAssetKind,
  type UnifiedSearchGroups,
} from "@/domains/market/types";

export const MARKET_SEARCH_MIN_QUERY_LENGTH = 3;
const SEARCH_FRESH_MS = 30_000;

const searchCache = createRequestCache<UnifiedSearchGroups>({ ttlMs: SEARCH_FRESH_MS, staleMs: 2 * SEARCH_FRESH_MS });
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let debounceController: AbortController | null = null;

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function s(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
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

async function searchStocksRaw(query: string, signal?: AbortSignal): Promise<unknown[]> {
  const payload = await fetcher<unknown>(`/stocks/search?q=${encodeURIComponent(query)}`, {
    signal,
    noRedirectOn401: true,
    raw: true,
    cache: "no-store",
  });
  return Array.isArray(unwrap(payload)) ? (unwrap(payload) as unknown[]) : [];
}

async function searchMutualFundsRaw(query: string, signal?: AbortSignal): Promise<unknown[]> {
  const payload = await fetcher<unknown>(`/mutual-funds/search?q=${encodeURIComponent(query)}`, {
    signal,
    noRedirectOn401: true,
    raw: true,
    cache: "no-store",
  });
  return Array.isArray(unwrap(payload)) ? (unwrap(payload) as unknown[]) : [];
}

async function searchCommoditiesRaw(query: string, signal?: AbortSignal): Promise<unknown[]> {
  const payload = await fetcher<unknown>(`/commodities/search?q=${encodeURIComponent(query)}`, {
    signal,
    noRedirectOn401: true,
    raw: true,
    cache: "no-store",
  });
  const data = unwrap(payload);
  return Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
}

function normalizeStockEntity(item: unknown): MarketAsset {
  const record = safeRecord(item);
  const symbol = s(record.symbol);
  const name = s(record.name, symbol);
  const isEtf = /ETF/i.test(name);
  const kind = (isEtf ? "etf" : symbol.includes("=") ? "forex" : "stock") as MarketAssetKind;
  const isIndia = symbol.endsWith(".NS") || symbol.endsWith(".BO");
  const price = n(record.price ?? record.regularMarketPrice);
  const changePercent = n(record.changePercent ?? record.regularMarketChangePercent);

  return {
    id: marketId(kind, symbol),
    symbol,
    name,
    kind,
    market: (isIndia ? "India" : "Global") as MarketAsset["market"],
    sector: isEtf ? "ETF" : "Equity",
    category: isEtf ? "ETF" : "Stock",
    price,
    change: n(record.change ?? record.regularMarketChange),
    changePercent,
    volume: n(record.volume ?? record.regularMarketVolume),
    marketCap: n(record.marketCap),
    currency: isIndia ? "INR" : "USD",
    sparkline: buildSparkline(symbol, n(price, 100), changePercent),
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeMutualFundEntity(item: unknown): MarketAsset {
  const record = safeRecord(item);
  const code = s(record.code, s(record.symbol));
  const nav = n(record.nav);

  return {
    id: marketId("mutual-fund", code),
    symbol: code,
    name: s(record.name, code),
    kind: "mutual-fund",
    market: "Fund",
    sector: s(record.category, "Mutual Fund"),
    category: s(record.category, "Mutual Fund"),
    price: nav,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: 0,
    currency: "INR",
    sparkline: buildSparkline(code, n(nav, 100), 0.2),
    lastUpdated: new Date().toISOString(),
    searchLabel: s(record.fundHouse ?? record.fund_house),
  };
}

function normalizeCommodityEntity(item: unknown, index: number): MarketAsset {
  const record = safeRecord(item);
  const symbol = s(record.symbol ?? record.code, `CMD-${index}`);
  const price = n(record.price ?? record.ltp ?? record.last_price ?? record.current_price);
  const changePercent = n(record.changePercent ?? record.change_percent ?? record.percent_change);

  return {
    id: marketId("commodity", symbol),
    symbol,
    name: s(record.name, symbol),
    kind: ["gold", "silver"].includes(symbol.toLowerCase()) ? "metal" : "commodity",
    market: "Commodity",
    sector: s(record.category ?? record.segment, "Commodity"),
    category: s(record.category ?? record.segment, "Commodity"),
    price,
    change: n(record.change ?? record.price_change ?? record.net_change),
    changePercent,
    volume: n(record.volume),
    marketCap: 0,
    currency: "INR",
    sparkline: buildSparkline(symbol, n(price, 100), changePercent),
    lastUpdated: new Date().toISOString(),
    searchLabel: s(record.exchange),
  };
}

function dedupeEntities(items: MarketAsset[]) {
  const byId = new Map<string, MarketAsset>();
  for (const item of items) {
    if (!item.id || !item.symbol) continue;
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function dedupeCommandItems(items: CommandSearchItem[]) {
  const byId = new Map<string, CommandSearchItem>();
  for (const item of items) {
    if (!item.id || !item.label) continue;
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function normalizeClientEntity(item: unknown): CommandSearchItem | null {
  const record = safeRecord(item);
  const id = n(record.id ?? record.client_id ?? record.user_id);
  const name = s(record.name ?? record.client_name);
  if (!id || !name) return null;
  return {
    id: `client:${id}`,
    label: name,
    subtitle: s(record.email ?? record.phone ?? record.lifecycle),
    kind: "client",
  };
}

function normalizePortfolioEntity(item: unknown): CommandSearchItem | null {
  const record = safeRecord(item);
  const id = n(record.id);
  const type = s(record.type, "asset").toUpperCase();
  const name = s(record.name ?? record.symbol ?? `${type} Holding`);
  if (!id) return null;
  return {
    id: `portfolio:${id}`,
    label: name,
    subtitle: type,
    kind: "portfolio",
  };
}

function toCommandItems(values: string[], kind: "sector" | "theme"): CommandSearchItem[] {
  return values.map((value) => ({
    id: `${kind}:${value.toLowerCase()}`,
    label: value,
    kind,
  }));
}

async function searchClientsRaw(query: string, signal?: AbortSignal): Promise<unknown[]> {
  try {
    const payload = await fetcher<unknown>(`/admin/clients?search=${encodeURIComponent(query)}&limit=8`, {
      signal,
      noRedirectOn401: true,
      raw: true,
      cache: "no-store",
    });
    const unwrapped = unwrap(payload);
    if (Array.isArray(unwrapped)) return unwrapped;
    if (Array.isArray(safeRecord(unwrapped).items)) return safeRecord(unwrapped).items as unknown[];
    return [];
  } catch {
    return [];
  }
}

async function searchPortfoliosRaw(query: string, signal?: AbortSignal): Promise<unknown[]> {
  try {
    const payload = await fetcher<unknown>(`/assets?search=${encodeURIComponent(query)}&limit=8`, {
      signal,
      noRedirectOn401: true,
      raw: true,
      cache: "no-store",
    });
    const unwrapped = unwrap(payload);
    const record = safeRecord(unwrapped);
    if (Array.isArray(unwrapped)) return unwrapped;
    if (Array.isArray(record.assets)) return record.assets as unknown[];
    if (Array.isArray(record.items)) return record.items as unknown[];
    return [];
  } catch {
    return [];
  }
}

export async function searchMarket(
  query: string,
  options: { signal?: AbortSignal; watchlistSymbols?: string[]; watchlistAssets?: MarketAsset[] } = {}
): Promise<UnifiedSearchGroups> {
  const normalized = query.trim();
  if (!normalized || normalized.length < MARKET_SEARCH_MIN_QUERY_LENGTH) return EMPTY_SEARCH_GROUPS;
  const key = normalized.toLowerCase();

  const cached = searchCache.read(key);
  if (cached?.value && !cached.stale) return cached.value;

  return searchCache.getOrCreate(key, async () => {
    const [stocksRaw, mutualFundsRaw, commoditiesRaw, clientsRaw, portfoliosRaw] = await Promise.all([
      searchStocksRaw(normalized, options.signal),
      searchMutualFundsRaw(normalized, options.signal),
      searchCommoditiesRaw(normalized, options.signal),
      searchClientsRaw(normalized, options.signal),
      searchPortfoliosRaw(normalized, options.signal),
    ]);

    const normalizedStocks = dedupeEntities(stocksRaw.map(normalizeStockEntity));
    const etfs = normalizedStocks.filter((item) => item.kind === "etf").slice(0, 8);
    const stocks = normalizedStocks.filter((item) => item.kind !== "etf").slice(0, 8);
    const mutualFunds = dedupeEntities(mutualFundsRaw.map(normalizeMutualFundEntity)).slice(0, 8);
    const commodities = dedupeEntities(commoditiesRaw.map(normalizeCommodityEntity)).slice(0, 8);

    const watchSymbols = new Set((options.watchlistSymbols ?? []).map((item) => item.toUpperCase()));
    const watchlist = dedupeEntities([
      ...(options.watchlistAssets ?? []).filter((item) => watchSymbols.has(item.symbol.toUpperCase())),
      ...stocks.filter((item) => watchSymbols.has(item.symbol.toUpperCase())),
      ...mutualFunds.filter((item) => watchSymbols.has(item.symbol.toUpperCase())),
      ...commodities.filter((item) => watchSymbols.has(item.symbol.toUpperCase())),
    ]);
    const sectors = toCommandItems(
      [...new Set(stocks.map((item) => item.sector).filter(Boolean))].slice(0, 8),
      "sector"
    );
    const themes = toCommandItems(
      [...new Set([...stocks, ...etfs].map((item) => item.category).filter(Boolean))].slice(0, 8),
      "theme"
    );
    const clients = dedupeCommandItems(clientsRaw.map(normalizeClientEntity).filter(Boolean) as CommandSearchItem[]).slice(0, 8);
    const portfolios = dedupeCommandItems(portfoliosRaw.map(normalizePortfolioEntity).filter(Boolean) as CommandSearchItem[]).slice(0, 8);

    const groups: UnifiedSearchGroups = {
      stocks,
      etfs,
      mutualFunds,
      commodities,
      watchlist,
      clients,
      portfolios,
      sectors,
      themes,
    };

    searchCache.write(key, groups);
    return groups;
  });
}

export function searchMarketDebounced(
  query: string,
  options: {
    delayMs?: number;
    watchlistSymbols?: string[];
    watchlistAssets?: MarketAsset[];
  } = {}
) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceController?.abort();
  debounceController = new AbortController();

  return new Promise<UnifiedSearchGroups>((resolve, reject) => {
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void searchMarket(query, {
        signal: debounceController?.signal,
        watchlistSymbols: options.watchlistSymbols,
        watchlistAssets: options.watchlistAssets,
      })
        .then(resolve)
        .catch(reject)
        .finally(() => {
          debounceController = null;
        });
    }, options.delayMs ?? 250);
  });
}

export function cancelDebouncedMarketSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  debounceController?.abort();
  debounceController = null;
}
