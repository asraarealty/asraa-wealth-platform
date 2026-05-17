"use client";

import { AuthenticatedAppRouteShell } from "@/components/app-shell/AuthenticatedAppRouteShell";
import { MarketTerminalPage } from "@/components/market/MarketTerminalPage";

export default function WatchlistPage() {
  return (
    <AuthenticatedAppRouteShell>
      <MarketTerminalPage variant="watchlist" />
    </AuthenticatedAppRouteShell>
  );
}
