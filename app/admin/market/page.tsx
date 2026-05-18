"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const MarketCommandCenter = dynamic(
  () => import("@/components/market/MarketCommandCenter").then((mod) => mod.MarketCommandCenter),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading market command center..." />,
  }
);

export default function AdminMarketPage() {
  return <MarketCommandCenter mode="admin" initialSurface="market-overview" />;
}
