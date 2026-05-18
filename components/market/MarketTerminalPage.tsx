"use client";

import { MarketCommandCenter, type WorkspaceSurface } from "@/components/market/MarketCommandCenter";

type Variant = "stocks" | "markets" | "watchlist" | "discover";

const SURFACE_BY_VARIANT: Record<Variant, WorkspaceSurface> = {
  stocks: "asset-detail",
  markets: "market-overview",
  watchlist: "top-movers",
  discover: "ai-analysis",
};

export function MarketTerminalPage({ variant }: { variant: Variant }) {
  return <MarketCommandCenter mode="client" initialSurface={SURFACE_BY_VARIANT[variant]} />;
}
