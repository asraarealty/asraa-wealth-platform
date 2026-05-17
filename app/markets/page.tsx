"use client";

import { AuthenticatedAppRouteShell } from "@/components/app-shell/AuthenticatedAppRouteShell";
import { MarketTerminalPage } from "@/components/market/MarketTerminalPage";

export default function MarketsPage() {
  return (
    <AuthenticatedAppRouteShell>
      <MarketTerminalPage variant="markets" />
    </AuthenticatedAppRouteShell>
  );
}
