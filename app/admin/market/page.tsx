"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const AdminMarketPanel = dynamic(
  () => import("@/components/admin-os/AdminMarketPanel").then((mod) => mod.AdminMarketPanel),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading market overlay..." />,
  }
);

const MarketTerminalPage = dynamic(
  () => import("@/components/market/MarketTerminalPage").then((mod) => mod.MarketTerminalPage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading portfolio engine..." />,
  }
);

export default function AdminMarketPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <AdminMarketPanel />
      <MarketTerminalPage variant="markets" />
    </div>
  );
}
