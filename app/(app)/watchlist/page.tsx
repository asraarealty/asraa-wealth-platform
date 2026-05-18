"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const MarketTerminalPage = dynamic(
  () => import("@/components/market/MarketTerminalPage").then((mod) => mod.MarketTerminalPage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading market route..." />,
  }
);

export default function WatchlistPage() {
  return <MarketTerminalPage variant="watchlist" />;
}
