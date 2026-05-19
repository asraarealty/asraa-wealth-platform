"use client";

import { MarketRouteEntry } from "@/components/market/MarketRouteEntry";

export default function DiscoverPage() {
  return <MarketRouteEntry mode="client" initialSurface="ai-analysis" operatorPreset="discover-engine" />;
}
