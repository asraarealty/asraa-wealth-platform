"use client";

import { MarketRouteEntry } from "@/components/market/MarketRouteEntry";

export default function MarketsPage() {
  return <MarketRouteEntry mode="client" initialSurface="market-overview" operatorPreset="markets-pulse" />;
}
