"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const MarketIntelligencePage = dynamic(
  () => import("@/components/market/MarketIntelligencePage").then((mod) => mod.MarketIntelligencePage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading intelligence route..." />,
  }
);

export default function IntelligencePage() {
  return <MarketIntelligencePage />;
}
