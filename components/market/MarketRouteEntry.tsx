"use client";

import dynamic from "next/dynamic";
import type { WorkspaceSurface } from "@/components/market/MarketCommandCenter";
import { LoadingBlock } from "@/components/v2/ui";
import { RuntimeErrorBoundary } from "@/components/runtime/RuntimeErrorBoundary";

/** Operator presets give each route a unique surface identity and layout. */
export type OperatorPreset =
  | "stocks-terminal"
  | "markets-pulse"
  | "watchlist-board"
  | "discover-engine";

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
  if (operatorPreset === "stocks-terminal") {
    return (
      <RuntimeErrorBoundary scope="market-pulse-component" label="stocks-terminal">
        <StocksTerminal />
      </RuntimeErrorBoundary>
    );
  }
  if (operatorPreset === "markets-pulse") {
    return (
      <RuntimeErrorBoundary scope="market-pulse-component">
        <MarketsPulse />
      </RuntimeErrorBoundary>
    );
  }
  if (operatorPreset === "watchlist-board") {
    return (
      <RuntimeErrorBoundary scope="runtime-stream-panel" label="watchlist-board">
        <WatchlistBoard />
      </RuntimeErrorBoundary>
    );
  }
  if (operatorPreset === "discover-engine") {
    return (
      <RuntimeErrorBoundary scope="market-pulse-component" label="discover-engine">
        <DiscoverEngine />
      </RuntimeErrorBoundary>
    );
  }
  // Default: existing MarketCommandCenter (used by admin and legacy routes)
  return (
    <RuntimeErrorBoundary scope="market-pulse-component">
      <MarketCommandCenter mode={mode} initialSurface={initialSurface} compact={compact} />
    </RuntimeErrorBoundary>
  );
}
