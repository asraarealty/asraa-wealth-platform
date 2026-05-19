"use client";

import dynamic from "next/dynamic";
import type { WorkspaceSurface } from "@/components/market/MarketCommandCenter";
import { LoadingBlock } from "@/components/v2/ui";

/** Operator presets give each route a unique surface identity and layout. */
export type OperatorPreset =
  | "stocks-terminal"
  | "markets-pulse"
  | "watchlist-board"
  | "discover-engine"
  | "intelligence-mission-control";

const MarketCommandCenter = dynamic(
  () => import("@/components/market/MarketCommandCenter").then((mod) => mod.MarketCommandCenter),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading market command center..." />,
  }
);

const StocksTerminal = dynamic(
  () => import("@/components/market/surfaces/StocksTerminal").then((mod) => mod.StocksTerminal),
  { ssr: false, loading: () => <LoadingBlock label="Loading stocks terminal..." /> }
);

const MarketsPulse = dynamic(
  () => import("@/components/market/surfaces/MarketsPulse").then((mod) => mod.MarketsPulse),
  { ssr: false, loading: () => <LoadingBlock label="Loading markets pulse..." /> }
);

const WatchlistBoard = dynamic(
  () => import("@/components/market/surfaces/WatchlistBoard").then((mod) => mod.WatchlistBoard),
  { ssr: false, loading: () => <LoadingBlock label="Loading watchlist board..." /> }
);

const DiscoverEngine = dynamic(
  () => import("@/components/market/surfaces/DiscoverEngine").then((mod) => mod.DiscoverEngine),
  { ssr: false, loading: () => <LoadingBlock label="Loading discovery engine..." /> }
);

const IntelligenceMissionControl = dynamic(
  () =>
    import("@/components/market/surfaces/IntelligenceMissionControl").then(
      (mod) => mod.IntelligenceMissionControl
    ),
  { ssr: false, loading: () => <LoadingBlock label="Loading intelligence mission control..." /> }
);

export function MarketRouteEntry({
  mode,
  initialSurface,
  compact = false,
  operatorPreset,
}: {
  mode: "client" | "admin";
  initialSurface: WorkspaceSurface;
  compact?: boolean;
  operatorPreset?: OperatorPreset;
}) {
  if (operatorPreset === "stocks-terminal") return <StocksTerminal />;
  if (operatorPreset === "markets-pulse") return <MarketsPulse />;
  if (operatorPreset === "watchlist-board") return <WatchlistBoard />;
  if (operatorPreset === "discover-engine") return <DiscoverEngine />;
  if (operatorPreset === "intelligence-mission-control") return <IntelligenceMissionControl />;

  // Default: existing MarketCommandCenter (used by admin and legacy routes)
  return <MarketCommandCenter mode={mode} initialSurface={initialSurface} compact={compact} />;
}
