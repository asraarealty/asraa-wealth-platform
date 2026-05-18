"use client";

import { useMarketOrchestrator } from "@/lib/services/marketOrchestrator";

export type {
  MarketAsset,
  MarketOverviewMetric,
  SectorMover,
  UnifiedSearchGroups,
  MarketSnapshot,
} from "@/lib/services/marketOrchestrator";

export { marketQueryKeys } from "./queryKeys";

export function useMarketDomainGraph() {
  return useMarketOrchestrator();
}
