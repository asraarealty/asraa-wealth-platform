"use client";

import { AdminMarketPanel } from "@/components/admin-os/AdminMarketPanel";
import { MarketTerminalPage } from "@/components/market/MarketTerminalPage";

export default function AdminMarketPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <AdminMarketPanel />
      <MarketTerminalPage variant="markets" />
    </div>
  );
}
