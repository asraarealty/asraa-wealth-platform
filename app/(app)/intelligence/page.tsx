"use client";

import { MarketRouteEntry } from "@/components/market/MarketRouteEntry";

export default function IntelligencePage() {
  return (
    <MarketRouteEntry
      mode="client"
      initialSurface="ai-analysis"
      operatorPreset="intelligence-mission-control"
    />
  );
}
