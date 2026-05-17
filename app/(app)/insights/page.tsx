"use client";

import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { useOperatingContext } from "@/context/OperatingContext";
import {
  EmptyBlock,
  ExposureBar,
  IntelligenceCard,
  LoadingBlock,
  MetricTile,
  RiskScorePanel,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  type IntelTone,
} from "@/components/v2/ui";

export default function InsightsPage() {
  const { data, isLoading, isError } = useOperatingSystemData();
  const { timeHorizon, riskProfile } = useOperatingContext();

  if (isLoading) return <LoadingBlock label="Loading analytics intelligence..." />;
  if (isError)
    return <EmptyBlock title="Analytics unavailable" message="Unable to load institutional analytics at this time." />;

  const { allocation, executive, realEstate, recommendations } = data;

  const diversScore = (() => {
    const active = [allocation.stock, allocation.mf, allocation.property, allocation.commodity ?? 0].filter(
      (v) => v > 0
    ).length;
    const largest = Math.max(
      allocation.stock,
      allocation.mf,
      allocation.property,
      allocation.commodity ?? 0
    );
    return Math.max(0, Math.round(active * 20 + (100 - largest) * 0.4));
  })();

  const diversTone: IntelTone = diversScore >= 70 ? "success" : diversScore >= 45 ? "warn" : "danger";

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Executive Analytics"
          title="Institutional-grade portfolio analytics"
          subtitle={`Horizon ${timeHorizon.toUpperCase()} · Profile ${riskProfile}`}
        />
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile
            label="Portfolio Health"
            value={executive.returnPct >= 0 ? "Healthy" : "At Risk"}
            change={executive.returnPct >= 0 ? "Positive returns" : "Below cost basis"}
            positive={executive.returnPct >= 0}
          />
          <MetricTile label="Risk State" value={executive.riskState} />
          <MetricTile
            label="Equity Exposure"
            value={`${allocation.stock.toFixed(1)}%`}
            sub="Liquid equities"
          />
          <MetricTile
            label="Real Estate Exposure"
            value={`${allocation.property.toFixed(1)}%`}
            sub="Illiquid RE"
          />
        </div>
      </SurfaceCard>

      {/* ── Attribution + Risk panel ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Diagnostic Analytics"
            title="Attribution and concentration"
            subtitle="Return drivers and allocation drift"
          />
          <div className="mt-4 space-y-4">
            {[
              { label: "Equities", val: allocation.stock, color: "#3b82f6", note: "Market-traded securities" },
              { label: "Mutual Funds", val: allocation.mf, color: "#10b981", note: "NAV-based instruments" },
              { label: "Real Estate", val: allocation.property, color: "#8b5cf6", note: "Direct property holdings" },
              { label: "Commodities", val: allocation.commodity ?? 0, color: "#f59e0b", note: "Gold and physical assets" },
            ].map((x) => (
              <div key={x.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div>
                    <span className="text-slate-300 font-medium">{x.label}</span>
                    <span className="ml-2 text-slate-600">{x.note}</span>
                  </div>
                  <span className="text-white font-semibold tabular-nums">{x.val.toFixed(1)}%</span>
                </div>
                <ExposureBar label="" value={x.val} color={x.color} />
              </div>
            ))}
          </div>

          {/* Cross-exposure summary */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3">
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Market exposure</p>
              <p className="mt-1.5 text-xl font-bold text-white">
                {((allocation.stock ?? 0) + (allocation.mf ?? 0)).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Equity + Mutual Funds</p>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Illiquid exposure</p>
              <p className="mt-1.5 text-xl font-bold text-white">
                {((allocation.property ?? 0) + (allocation.commodity ?? 0)).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Real Estate + Commodities</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Risk Scoring" title="Portfolio risk" subtitle="Multi-factor risk assessment" />
          <div className="mt-4 space-y-3">
            <RiskScorePanel
              score={executive.riskState}
              label="Computed from concentration, exposure imbalance and inactivity"
              context="Refreshed on each portfolio update"
            />

            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">
                Diversification score
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xl font-bold text-white">{diversScore}</p>
                <StatusPill
                  label={diversScore >= 70 ? "Well diversified" : diversScore >= 45 ? "Moderate" : "Low"}
                  tone={diversTone}
                />
              </div>
              <div className="mt-2 exposure-bar">
                <div
                  className="exposure-bar-fill"
                  style={{
                    width: `${diversScore}%`,
                    background: diversScore >= 70 ? "#10b981" : diversScore >= 45 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>

            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Rental yield</p>
              <p className="mt-1.5 text-xl font-bold text-white">{realEstate.rentalYieldPct.toFixed(1)}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Annualised gross yield on RE holdings</p>
            </div>

            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">
                Occupancy rate
              </p>
              <p className="mt-1.5 text-xl font-bold text-white">{realEstate.occupancyPct.toFixed(0)}%</p>
              <StatusPill
                label={realEstate.occupancyPct >= 90 ? "Healthy" : realEstate.occupancyPct >= 70 ? "Watch" : "Low"}
                tone={realEstate.occupancyPct >= 90 ? "success" : realEstate.occupancyPct >= 70 ? "warn" : "danger"}
              />
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* ── AI intelligence recommendations ─────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="AI Intelligence Layer"
          title="Operational recommendations"
          subtitle="Confidence-scored, contextually generated from live portfolio data"
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendations.length === 0 ? (
            <IntelligenceCard
              title="No active recommendations"
              message="Portfolio is operating within healthy parameters. Continue monitoring for rebalancing triggers or new concentration risk."
              tone="success"
            />
          ) : (
            recommendations.map((rec) => (
              <IntelligenceCard
                key={rec.id}
                title={rec.title}
                message={rec.rationale}
                confidence={rec.confidence}
                tone={rec.confidence >= 0.8 ? "danger" : rec.confidence >= 0.65 ? "warn" : "info"}
              />
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
