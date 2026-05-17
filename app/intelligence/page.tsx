"use client";

import { AuthenticatedAppRouteShell } from "@/components/app-shell/AuthenticatedAppRouteShell";
import { MarketIntelligencePage } from "@/components/market/MarketIntelligencePage";

export default function IntelligencePage() {
  return (
    <AuthenticatedAppRouteShell>
      <MarketIntelligencePage />
    </AuthenticatedAppRouteShell>
  );
}
