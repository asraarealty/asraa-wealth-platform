"use client";

import { MarketRouteEntry } from "@/components/market/MarketRouteEntry";

export default function StocksPage() {
  return <MarketRouteEntry mode="client" initialSurface="asset-detail" operatorPreset="stocks-terminal" />;
}
