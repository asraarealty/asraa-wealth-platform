"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { EmptyBlock, LoadingBlock, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { RuntimeErrorBoundary } from "@/components/runtime/RuntimeErrorBoundary";

const PortfolioHealthSection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.PortfolioHealthSection),
  { loading: () => <DashboardSectionSkeleton /> }
);
const PropertyIncomeOccupancySection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.PropertyIncomeOccupancySection),
  { loading: () => <DashboardSectionSkeleton /> }
);
const FeaturedOpportunitiesSection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.FeaturedOpportunitiesSection),
  { loading: () => <DashboardSectionSkeleton /> }
);
const RecentActivitySection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.RecentActivitySection),
  { loading: () => <DashboardSectionSkeleton /> }
);

function DashboardSectionSkeleton() {
  return <div className="h-56 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtMetric(value: number | string | null | undefined, suffix = "") {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}${suffix}`;
  if (typeof value === "string" && value.trim()) return value;
  return "—";
}

function getMetric(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function InlineEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 text-center">
      <p className="text-xs font-semibold text-slate-200">{title}</p>
      <p className="mt-1 text-[11px] text-slate-500">{message}</p>
    </div>
  );
}

const OPERATION_PANELS = [
  "Holdings",
  "Activity Feed",
  "Alerts",
  "Recommendations",
  "Risk Events",
  "Income Streams",
  "Pending Actions",
] as const;
type OperationPanel = (typeof OPERATION_PANELS)[number];

export default function DashboardPage() {
  const { data, isLoading, isError, marketSyncNotice, refetchAll } = useOperatingSystemData();
  const [activePanel, setActivePanel] = useState<OperationPanel>("Holdings");
  const [collapsedPanels, setCollapsedPanels] = useState<OperationPanel[]>([]);

  if (isLoading) return <LoadingBlock />;
  if (isError) {
    return (
      <EmptyBlock
        title="Unable to load portfolio data"
        message="Please retry to reconnect portfolio and intelligence data."
      />
    );
  }

  const riskRecord = (data.risk ?? {}) as Record<string, unknown>;
  const allocationRecord = data.allocation as unknown as Record<string, unknown>;
  const cashExposure = getMetric(allocationRecord, ["cash", "cash_exposure", "cashExposure"]);
  const allocationDrift = getMetric(riskRecord, ["allocation_drift", "allocationDrift", "drift"]);
  const concentrationScore = getMetric(
    (riskRecord.concentration as Record<string, unknown>) ?? {},
    ["score", "level", "label"]
  );
  const diversificationScore = getMetric(
    (riskRecord.diversification as Record<string, unknown>) ?? {},
    ["score", "level", "label"]
  );
  const healthScore = getMetric(riskRecord, ["health_score", "healthScore", "portfolio_health_score"]);
  const largestHoldings = useMemo(
    () =>
      [...(data.assets ?? [])]
        .sort((a, b) => Number(b?.value ?? 0) - Number(a?.value ?? 0))
        .slice(0, 5),
    [data.assets]
  );

  const executiveStrip = [
    { label: "Net Worth", value: fmtCurrency(data.executive.netWorth ?? data.executive.totalValue) },
    { label: "Invested Capital", value: fmtCurrency(data.executive.totalInvested ?? 0) },
    { label: "Unrealized P/L", value: fmtCurrency(data.executive.totalReturn ?? 0) },
    { label: "Monthly Income", value: fmtCurrency(data.executive.monthlyIncome ?? 0) },
    { label: "Health Score", value: fmtMetric(healthScore, typeof healthScore === "number" ? "/100" : "") },
    { label: "Risk Score", value: fmtMetric(concentrationScore) },
    { label: "Allocation Drift", value: fmtMetric(allocationDrift, typeof allocationDrift === "number" ? "%" : "") },
    { label: "Cash Exposure", value: fmtMetric(cashExposure, typeof cashExposure === "number" ? "%" : "") },
  ];
  const primaryExecutiveStrip = executiveStrip.slice(0, 4);
  const secondaryExecutiveStrip = executiveStrip.slice(4);
  const recommendationItems = data.recommendations.slice(0, 3).map((rec) => ({
    title: rec.title,
    message: rec.rationale,
    tone: "info" as const,
    confidence: rec.confidence,
  }));
  const alerts = (data.typedAlerts.length > 0 ? data.typedAlerts : data.priorityActions).slice(0, 8);
  const riskEvents = data.priorityActions.slice(0, 8);

  const toggleCollapse = (panel: OperationPanel) => {
    setCollapsedPanels((prev) => (prev.includes(panel) ? prev.filter((item) => item !== panel) : [...prev, panel]));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionHeader
            eyebrow="Portfolio Command Center"
            title="Executive Summary"
            subtitle="Backend-authoritative outcomes and risk posture"
          />
          <button onClick={refetchAll} className="v2-action text-xs" type="button">
            Refresh
          </button>
        </div>
        {marketSyncNotice ? (
          <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {marketSyncNotice}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {primaryExecutiveStrip.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-base font-semibold text-white tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {secondaryExecutiveStrip.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-white tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Allocation + Holdings"
          title="Allocation Decision Surface"
          subtitle="Exposure, concentration, and largest positions in one view"
        />
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Asset-Class Exposure</p>
            <div className="mt-3 space-y-2">
              {[
                { label: "Stocks", value: data.allocation.stock },
                { label: "Mutual Funds", value: data.allocation.mf },
                { label: "Property", value: data.allocation.property },
                { label: "Commodities", value: data.allocation.commodity },
              ].map((slice) => (
                <div key={slice.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{slice.label}</span>
                    <span className="font-semibold text-white tabular-nums">{fmtMetric(slice.value, "%")}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                    <div className="h-1.5 rounded-full bg-sky-400" style={{ width: `${Math.max(0, Math.min(100, Number(slice.value ?? 0)))}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                Sector Exposure: {fmtMetric(getMetric(allocationRecord, ["sector_exposure", "sectorExposure"]))}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                Concentration Risk: {fmtMetric(concentrationScore)}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                Diversification Score: {fmtMetric(diversificationScore)}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                Allocation Drift: {fmtMetric(allocationDrift)}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Largest Holdings</p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {largestHoldings.length === 0 ? (
                <InlineEmptyState
                  title="No holdings available"
                  message="Add or sync holdings to unlock concentration and sizing decisions."
                />
              ) : (
                largestHoldings.map((asset) => (
                  <div key={String(asset.id)} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <p className="truncate text-sm font-semibold text-white">{asset.name ?? asset.symbol}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{asset.type ?? "Holding"}</p>
                    <p className="mt-1 text-xs text-slate-200 tabular-nums">{fmtCurrency(Number(asset.value ?? 0))}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {OPERATION_PANELS.map((panel) => (
            <button
              key={panel}
              type="button"
              onClick={() => setActivePanel(panel)}
              className={`rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] ${
                activePanel === panel
                  ? "border-sky-300/40 bg-sky-500/10 text-sky-200"
                  : "border-white/10 bg-black/20 text-slate-400"
              }`}
            >
              {panel}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {OPERATION_PANELS.map((panel) => {
            const collapsed = collapsedPanels.includes(panel);
            return (
              <section key={panel} className="rounded-xl border border-white/10 bg-black/20">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{panel}</p>
                  <button type="button" className="text-[11px] text-slate-300" onClick={() => toggleCollapse(panel)}>
                    {collapsed ? "Expand" : "Collapse"}
                  </button>
                </div>
                {!collapsed ? (
                  <div className="max-h-72 overflow-y-auto p-3">
                    {panel === "Holdings" ? (
                      largestHoldings.length > 0 ? (
                        <ul className="space-y-2">
                          {largestHoldings.map((asset) => (
                            <li key={`holding-${asset.id}`} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-200">
                              {(asset.name ?? asset.symbol) as string}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <InlineEmptyState
                          title="No holdings in focus"
                          message="This panel will populate once holdings are connected."
                        />
                      )
                    ) : null}
                    {panel === "Activity Feed" ? (
                      <RuntimeErrorBoundary scope="market-pulse-component">
                        <RecentActivitySection data={data} />
                      </RuntimeErrorBoundary>
                    ) : null}
                    {panel === "Recommendations" ? (
                      <RuntimeErrorBoundary scope="intelligence-widget">
                        <PortfolioHealthSection
                          state={data.executive.riskState === "High" ? "Action Needed" : data.executive.riskState === "Medium" ? "Watch" : "Healthy"}
                          recommendations={
                            recommendationItems.length > 0
                              ? recommendationItems
                              : [
                                  {
                                    title: "No active recommendations",
                                    message: "System recommendations will appear when new intelligence triggers.",
                                    tone: "info",
                                  },
                                ]
                          }
                        />
                      </RuntimeErrorBoundary>
                    ) : null}
                    {panel === "Income Streams" ? (
                      <RuntimeErrorBoundary scope="property-income-occupancy-section">
                        <PropertyIncomeOccupancySection data={data} />
                      </RuntimeErrorBoundary>
                    ) : null}
                    {panel === "Pending Actions" ? (
                      <RuntimeErrorBoundary scope="featured-opportunities-section">
                        <FeaturedOpportunitiesSection data={data} />
                      </RuntimeErrorBoundary>
                    ) : null}
                    {panel === "Alerts" ? (
                      alerts.length > 0 ? (
                        <ul className="space-y-2">
                          {alerts.map((item, index) => (
                            <li key={`alert-${index}`} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-200">
                              {"title" in item ? item.title : "Alert"}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <InlineEmptyState
                          title="No active alerts"
                          message="Risk and operational alerts will appear here as conditions change."
                        />
                      )
                    ) : null}
                    {panel === "Risk Events" ? (
                      riskEvents.length > 0 ? (
                        <ul className="space-y-2">
                          {riskEvents.map((action) => (
                            <li key={action.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-200">
                              {action.title}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <InlineEmptyState
                          title="No risk events"
                          message="Major risk actions will be listed here when intervention is required."
                        />
                      )
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </SurfaceCard>
    </div>
  );
}
