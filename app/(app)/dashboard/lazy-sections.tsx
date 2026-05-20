"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertFeedItem,
  MetricTile,
  PropertyHealthCard,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  type IntelTone,
} from "@/components/v2/ui";
import { MarketCommandCenter } from "@/components/market/MarketCommandCenter";
import type { DashboardOperatingData } from "@/lib/hooks/useOperatingSystem";

type HealthState = "Healthy" | "Watch" | "Action Needed";

interface RecommendationItem {
  title: string;
  message: string;
  tone: IntelTone;
  confidence?: number;
}

function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function PropertyIncomeOccupancySection({ data }: { data: DashboardOperatingData }) {
  const topProperties = data.properties.slice(0, 4);

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <SectionHeader
        eyebrow="Property Income & Occupancy"
        title="Property Income & Occupancy"
        subtitle="Rental income, occupancy, overdue rent and valuation"
        action={<Link href="/real-estate" className="v2-link">View properties →</Link>}
      />

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricTile label="Rental Income" value={fmtCompact(data.realEstate.monthlyRent)} sub="per month" />
        <MetricTile label="Occupancy" value={`${data.realEstate.occupancyPct.toFixed(1)}%`} sub={`${data.realEstate.occupied} units occupied`} />
        <MetricTile label="Overdue Rent" value={String(data.realEstate.overdueRent)} sub="properties" />
        <MetricTile label="Property Valuation" value={fmtCompact(data.realEstate.totalValue)} />
      </div>

      {topProperties.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topProperties.map((p) => {
            const isOccupied = Boolean(p.tenant_name);
            const rentStatus: "overdue" | "due-soon" | "clear" = !p.rent_due_date
              ? "clear"
              : (() => {
                  const diff = Math.ceil((new Date(p.rent_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (diff < 0 && !p.rent_received) return "overdue";
                  if (diff <= 5 && !p.rent_received) return "due-soon";
                  return "clear";
                })();

            return (
              <PropertyHealthCard
                key={p.id}
                name={p.name}
                occupied={isOccupied}
                rentStatus={rentStatus}
                monthlyRent={p.rent_amount ? fmtCompact(Number(p.rent_amount)) : "—"}
              />
            );
          })}
        </div>
      ) : null}
    </SurfaceCard>
  );
}

export function PortfolioHealthSection({
  state,
  recommendations,
}: {
  state: HealthState;
  recommendations: RecommendationItem[];
}) {
  const [showConfidence, setShowConfidence] = useState(false);

  const tone = state === "Action Needed" ? "danger" : state === "Watch" ? "warn" : "success";

  const orderedRecommendations = useMemo(() => recommendations.slice(0, 3), [recommendations]);

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <SectionHeader
        eyebrow="Portfolio Health"
        title="Portfolio Health"
        subtitle="Clear risk state and focused next steps"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusPill label={state} tone={tone} />
        <button type="button" className="v2-action" onClick={() => setShowConfidence((v) => !v)}>
          {showConfidence ? "Hide confidence" : "Show confidence"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {orderedRecommendations.map((item, index) => (
          <div key={`${item.title}-${index}`} className="v2-tile rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white leading-snug">{item.title}</p>
              <StatusPill label={item.tone === "danger" ? "Priority" : item.tone === "warn" ? "Watch" : item.tone === "success" ? "Good" : "Info"} tone={item.tone === "danger" ? "danger" : item.tone === "warn" ? "warn" : item.tone === "success" ? "success" : "info"} />
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.message}</p>
            {showConfidence && typeof item.confidence === "number" ? (
              <p className="mt-1 text-[11px] text-slate-500">{Math.round(item.confidence * 100)}% confidence</p>
            ) : null}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

export function RecentActivitySection({ data }: { data: DashboardOperatingData }) {
  return (
    <SurfaceCard className="p-5 sm:p-6">
      <SectionHeader
        eyebrow="Recent Activity"
        title="Recent Activity"
        subtitle="Latest events across your portfolio"
        action={<Link href="/activity" className="v2-link">View all →</Link>}
      />
      <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {data.activityFeed.length === 0 ? (
          <p className="text-xs text-slate-500">No recent activity recorded.</p>
        ) : (
          data.activityFeed.slice(0, 6).map((event) => (
            <AlertFeedItem
              key={event.id}
              title={event.title}
              message={event.message}
              type={event.type}
              timestamp={event.timestamp}
            />
          ))
        )}
      </div>
    </SurfaceCard>
  );
}

export function MarketIntelligenceSection() {
  return (
    <SurfaceCard className="p-4 sm:p-5">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400/70">Optional Market Intelligence</p>
              <h2 className="text-sm sm:text-lg font-semibold text-white leading-tight">Market Command Center</h2>
              <p className="text-xs text-slate-500 mt-0.5">Secondary market context for optional review</p>
            </div>
            <span className="v2-action">Expand</span>
          </div>
        </summary>
        <div className="mt-4">
          <MarketCommandCenter mode="client" initialSurface="market-overview" compact />
        </div>
      </details>
    </SurfaceCard>
  );
}
