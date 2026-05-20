"use client";

import type { MarketSnapshot } from "@/domains/market/types";
import { EMPTY_BREADTH, EMPTY_SEARCH_GROUPS } from "@/domains/market/types";

const INITIAL_RUNTIME_STATUS = {
  connected: true,
  replayActive: false,
  staleRuntime: false,
  currentSequence: 0,
  resumeSequence: 0,
  degradedSources: [],
};

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
    commodityUnavailable: false,
    groups: EMPTY_SEARCH_GROUPS,
  },
  runtime: INITIAL_RUNTIME_STATUS,
};

const listeners = new Set<() => void>();

export function getMarketSnapshot() {
  return snapshot;
}

export function setMarketSnapshot(next: Partial<MarketSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export function resetMarketSnapshot() {
  snapshot = {
    ...snapshot,
    ...{
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
        commodityUnavailable: false,
        groups: EMPTY_SEARCH_GROUPS,
      },
      runtime: INITIAL_RUNTIME_STATUS,
    },
  };
  listeners.forEach((listener) => listener());
}

export function subscribeMarketStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMarketSubscriberCount() {
  return listeners.size;
}

