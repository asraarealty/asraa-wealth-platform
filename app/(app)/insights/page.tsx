"use client";

import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { useOperatingContext } from "@/context/OperatingContext";
import { EmptyBlock, LoadingBlock, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";

export default function InsightsPage() {
  const { data, isLoading, isError } = useOperatingSystemData();
  const { timeHorizon, riskProfile } = useOperatingContext();

  if (isLoading) return <LoadingBlock label="Loading analytics intelligence..." />;
  if (isError) return <EmptyBlock title="Analytics unavailable" message="Unable to load institutional analytics at this time." />;

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Executive Snapshot"
          title="Institutional-quality analytics"
          subtitle={`Horizon ${timeHorizon.toUpperCase()} · Profile ${riskProfile}`}
        />
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="Portfolio Health" value={data.executive.returnPct >= 0 ? "Healthy" : "At Risk"} />
          <MetricTile label="Risk State" value={data.executive.riskState} />
          <MetricTile label="Equity Exposure" value={`${data.allocation.stock.toFixed(1)}%`} />
          <MetricTile label="Property Exposure" value={`${data.allocation.property.toFixed(1)}%`} />
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Diagnostic Analytics" title="Attribution and concentration" subtitle="Return drivers and allocation drift" />

        <div className="mt-4 space-y-3">
          {[
            { label: "Stocks", val: data.allocation.stock, color: "#38bdf8" },
            { label: "Mutual Funds", val: data.allocation.mf, color: "#34d399" },
            { label: "Property", val: data.allocation.property, color: "#a78bfa" },
          ].map((x) => (
            <div key={x.label} className="v2-tile rounded-xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">{x.label}</span>
                <span className="text-white">{x.val.toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${x.val}%`, background: x.color }} />
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Predictive Layer" title="Scenario and recommendation engine" subtitle="Confidence-scored next-best actions" />

        <div className="mt-4 space-y-2">
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-slate-400">No predictive opportunities at the moment.</p>
          ) : (
            data.recommendations.map((rec) => (
              <div key={rec.id} className="v2-tile rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white font-semibold">{rec.title}</p>
                  <StatusPill label={`${Math.round(rec.confidence * 100)}% confidence`} tone="info" />
                </div>
                <p className="text-xs text-slate-400 mt-1">{rec.rationale}</p>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
