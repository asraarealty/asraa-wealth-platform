"use client";

import { useQuery } from "@tanstack/react-query";
import { SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { getMarketCapabilities } from "@/lib/services/market";

function statusTone(active: boolean): "success" | "warn" {
  return active ? "success" : "warn";
}

export function SystemCapabilityPanel() {
  const capabilitiesQuery = useQuery({
    queryKey: ["market-capabilities", "panel"],
    queryFn: () => getMarketCapabilities({ staleWhileRevalidate: true }),
    staleTime: 5 * 60_000,
  });

  const capabilities = capabilitiesQuery.data;

  const rows = [
    {
      label: "Live stock pricing",
      value: capabilities?.stockQuotes ? "available" : "unavailable",
      tone: statusTone(Boolean(capabilities?.stockQuotes)),
    },
    {
      label: "Bulk quotes",
      value: capabilities?.bulkQuotes ? "active" : "inactive",
      tone: statusTone(Boolean(capabilities?.bulkQuotes)),
    },
    {
      label: "Commodity engine",
      value: capabilities?.commodityPricing ? "active" : "inactive",
      tone: statusTone(Boolean(capabilities?.commodityPricing)),
    },
    {
      label: "MF NAV sync",
      value: capabilities?.mfNav ? "active" : "inactive",
      tone: statusTone(Boolean(capabilities?.mfNav)),
    },
    {
      label: "Realtime streaming",
      value: capabilities?.realtimeStreaming ? "active" : "pending",
      tone: capabilities?.realtimeStreaming ? "success" : "warn",
    },
    { label: "AI intelligence", value: "active", tone: "success" as const },
    { label: "Exports", value: "active", tone: "success" as const },
  ];

  return (
    <SurfaceCard className="p-4 sm:p-5">
      <SectionHeader
        eyebrow="System Capability Panel"
        title="Backend/frontend capability alignment"
        subtitle="Runtime detection keeps valuation flows capability-aware instead of assumption-driven."
      />

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="v2-tile rounded-xl p-3">
            <p className="text-xs text-slate-400">{row.label}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white uppercase tracking-[0.06em]">{row.value}</p>
              <StatusPill label={row.value} tone={row.tone} />
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
