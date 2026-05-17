"use client";

import { AuthenticatedAppRouteShell } from "@/components/app-shell/AuthenticatedAppRouteShell";
import { MarketTerminalPage } from "@/components/market/MarketTerminalPage";

export default function DiscoverPage() {
  return (
    <AuthenticatedAppRouteShell>
      <MarketTerminalPage variant="discover" />
    </AuthenticatedAppRouteShell>
  );
}
