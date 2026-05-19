"use client";

import dynamic from "next/dynamic";
import type { WorkspaceSurface } from "@/components/market/MarketCommandCenter";
import { LoadingBlock } from "@/components/v2/ui";

const MarketCommandCenter = dynamic(
  () => import("@/components/market/MarketCommandCenter").then((mod) => mod.MarketCommandCenter),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading market command center..." />,
  }
);

export function MarketRouteEntry({
  mode,
  initialSurface,
  compact = false,
}: {
  mode: "client" | "admin";
  initialSurface: WorkspaceSurface;
  compact?: boolean;
}) {
  return <MarketCommandCenter mode={mode} initialSurface={initialSurface} compact={compact} />;
}
