"use client";

import { AuthenticatedAppRouteShell } from "@/components/app-shell/AuthenticatedAppRouteShell";
import { MarketTerminalPage } from "@/components/market/MarketTerminalPage";

export default function StocksPage() {
  return (
    <AuthenticatedAppRouteShell>
      <MarketTerminalPage variant="stocks" />
    </AuthenticatedAppRouteShell>
  );
}
