"use client";

import { MarketCommandCenter } from "@/components/market/MarketCommandCenter";

export function AdminMarketPanel() {
  return <MarketCommandCenter mode="admin" initialSurface="market-overview" compact />;
}
