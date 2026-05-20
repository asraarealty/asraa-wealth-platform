"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getMarketAllocationOverlay } from "@/domains/market/allocation";
import { getMarketSnapshot, subscribeMarket } from "@/domains/market/graph";
import type { BreadthMetrics, MarketAsset, SectorMover } from "@/domains/market/types";

function limitItems<T>(items: T[], limit?: number) {
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export function useMarketSnapshot() {
  return useSyncExternalStore(subscribeMarket, getMarketSnapshot, getMarketSnapshot);
}

export function useTopGainers(limit?: number): MarketAsset[] {
  const { topGainers } = useMarketSnapshot();
  return useMemo(() => limitItems(topGainers, limit), [limit, topGainers]);
}

export function useTopLosers(limit?: number): MarketAsset[] {
  const { topLosers } = useMarketSnapshot();
  return useMemo(() => limitItems(topLosers, limit), [limit, topLosers]);
}

export function useMarketBreadth(): BreadthMetrics {
  return useMarketSnapshot().breadth;
}

export function useSectorRotation(limit?: number): SectorMover[] {
  const { sectorMovers } = useMarketSnapshot();
  return useMemo(() => limitItems(sectorMovers, limit), [limit, sectorMovers]);
}

export function usePortfolioExposure() {
  const { watchlist } = useMarketSnapshot();
  return useMemo(() => getMarketAllocationOverlay(watchlist), [watchlist]);
}

