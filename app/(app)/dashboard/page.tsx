"use client";

import dynamic from "next/dynamic";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import {
  EmptyBlock,
  LoadingBlock,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  type IntelTone,
} from "@/components/v2/ui";
import { useOperatingContext } from "@/context/OperatingContext";
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
const MarketSnapshotSection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.MarketSnapshotSection),
  { loading: () => <DashboardSectionSkeleton /> }
);

function DashboardSectionSkeleton() {
  return (
    <div className="h-56 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

type HealthState = "Healthy" | "Watch" | "Action Needed";
type StatusTone = "info" | "success" | "warn" | "danger";

interface RecommendationItem {
  title: string;
  message: string;
  tone: IntelTone;
  confidence?: number;
}

function mapHealthState(riskState: "Low" | "Medium" | "High"): HealthState {
  if (riskState === "High") return "Action Needed";
  if (riskState === "Medium") return "Watch";
  return "Healthy";
}

function mapHealthTone(state: HealthState): StatusTone {
  if (state === "Action Needed") return "danger";
  if (state === "Watch") return "warn";
  return "success";
}

const HEALTH_SCORE_BASE = {
  highRisk: 42,
  mediumRisk: 66,
  lowRisk: 88,
} as const;

/**
 * Truncates recommendation copy for compact cards.
 * The default limit keeps messages readable on tablet while preserving quick scanability.
 * Ellipsis is appended only when truncation occurs.
 */
function summarizeText(text: string, limit = 110) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit)}…`;
}

function computeHealthScore(data: ReturnType<typeof useOperatingSystemData>["data"]) {
  const base =
    data.executive.riskState === "High"
      ? HEALTH_SCORE_BASE.highRisk
      : data.executive.riskState === "Medium"
      ? HEALTH_SCORE_BASE.mediumRisk
      : HEALTH_SCORE_BASE.lowRisk;
  const diversificationRaw = Number(data.risk?.diversification?.score);
  // If diversification score is unavailable from backend hydration, keep a stable risk-state baseline.
  if (!Number.isFinite(diversificationRaw)) return base;
  const diversification = Math.max(0, Math.min(100, diversificationRaw));
  return Math.round(base * 0.65 + diversification * 0.35);
}

function buildHealthRecommendations(data: ReturnType<typeof useOperatingSystemData>["data"]): RecommendationItem[] {
  const actionItems: RecommendationItem[] = data.priorityActions.slice(0, 3).map((action) => ({
      title: action.title,
      message: summarizeText(action.description || "Review this portfolio action."),
      tone: action.severity === "high" ? "danger" : action.severity === "medium" ? "warn" : "info",
    }));

  const recommendationItems: RecommendationItem[] = data.recommendations.slice(0, 3).map((rec) => ({
      title: rec.title,
      message: summarizeText(rec.rationale || "Review this recommendation."),
      tone: "info",
      confidence: rec.confidence,
    }));

  const items: RecommendationItem[] = [...actionItems, ...recommendationItems];

  if (data.realEstate.overdueRent > 0) {
    items.push({
      title: "Address overdue rent",
      message: `${data.realEstate.overdueRent} propert${data.realEstate.overdueRent > 1 ? "ies have" : "y has"} pending rent collection.`,
      tone: "warn",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Portfolio is stable",
      message: "No immediate actions required. Continue regular monthly review.",
      tone: "success",
    });
  }

  return items.slice(0, 3);
}

function buildAllocation(data: ReturnType<typeof useOperatingSystemData>["data"]) {
  const allocationRecord = data.allocation as unknown as Record<string, unknown>;
  const stock = Math.max(0, data.allocation.stock ?? 0);
  const mf = Math.max(0, data.allocation.mf ?? 0);
  const property = Math.max(0, data.allocation.property ?? 0);
  const commodity = Math.max(0, data.allocation.commodity ?? 0);
  const fixedIncomeRaw = Number(allocationRecord.fixed_income ?? allocationRecord.fixedIncome);
  const fixedIncome = Number.isFinite(fixedIncomeRaw) ? Math.max(0, fixedIncomeRaw) : 0;
  const known = stock + mf + property + commodity + fixedIncome;
  const cash = known < 100 ? Math.max(0, 100 - known) : 0;

  return [
    { label: "Stocks", value: stock, color: "#3b82f6" },
    { label: "Mutual Funds", value: mf, color: "#10b981" },
    { label: "Property", value: property, color: "#8b5cf6" },
    { label: "Commodities", value: commodity, color: "#f59e0b" },
    { label: "Cash", value: cash, color: "#22d3ee" },
    { label: "Fixed Income", value: fixedIncome, color: "#64748b" },
  ];
}

function buildDonutGradient(slices: Array<{ value: number; color: string }>) {
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return "conic-gradient(#334155 0deg 360deg)";

  let current = 0;
  const segments: string[] = [];
  slices.forEach((slice) => {
    if (slice.value <= 0) return;
    const sweep = (slice.value / total) * 360;
    const start = current;
    const end = current + sweep;
    segments.push(`${slice.color} ${start}deg ${end}deg`);
    current = end;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

export default function DashboardPage() {
  const { data, isLoading, isError, marketSyncNotice, refetchAll } = useOperatingSystemData();
  const { timeHorizon, riskProfile } = useOperatingContext();

  if (isLoading) return <LoadingBlock />;
  if (isError) {
    return (
      <EmptyBlock
        title="Unable to load portfolio data"
        message="Please retry to reconnect portfolio and intelligence data."
      />
    );
  }

  const healthState = mapHealthState(data.executive.riskState);
  const healthTone = mapHealthTone(healthState);
  const healthScore = computeHealthScore(data);
  const recommendations = buildHealthRecommendations(data);
  const allocationSlices = buildAllocation(data);
  const backendClassCount = allocationSlices.filter((item) => item.label !== "Cash").length;
  const donutGradient = buildDonutGradient(allocationSlices);

  const topHolding = data.assets.reduce<(typeof data.assets)[number] | undefined>(
    (maxAsset, asset) => ((asset.value ?? 0) > (maxAsset?.value ?? 0) ? asset : maxAsset),
    undefined
  );
  const largestExposure = allocationSlices.reduce<(typeof allocationSlices)[number] | undefined>(
    (maxSlice, slice) => (slice.value > (maxSlice?.value ?? 0) ? slice : maxSlice),
    undefined
  );

  const activeClassCount = allocationSlices.filter((item) => item.label !== "Cash" && item.value > 0).length;
  const diversificationScore = Number.isFinite(Number(data.risk?.diversification?.score))
    ? Math.max(0, Math.min(100, Number(data.risk?.diversification?.score)))
    // Fallback proxy uses breadth of backend-provided asset classes when score is unavailable.
    : backendClassCount > 0
    ? Math.round((activeClassCount / backendClassCount) * 100)
    : 0;

  return (
    <div className="space-y-7 animate-fade-in">
      <SurfaceCard className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <SectionHeader
            eyebrow="Executive Summary"
            title="Your wealth at a glance"
            subtitle={`Horizon ${timeHorizon.toUpperCase()} · Risk profile ${riskProfile}`}
          />
          <button onClick={refetchAll} className="v2-action text-xs" type="button">
            Refresh
          </button>
        </div>

        {marketSyncNotice ? (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {marketSyncNotice}
          </div>
        ) : null}

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Net Worth</p>
              <p className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">{fmt(data.executive.netWorth ?? data.executive.totalValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Unrealized Gain/Loss</p>
              <p className={`mt-2 text-3xl sm:text-4xl font-bold tracking-tight ${data.executive.totalReturn >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {fmt(data.executive.totalReturn)}
              </p>
              <p className={`mt-1 text-xs font-medium ${data.executive.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmtPct(data.executive.returnPct)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Monthly Income</p>
              <p className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">{fmt(data.executive.monthlyIncome ?? 0)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Portfolio Health Score</p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{healthScore}</p>
                <p className="pb-1 text-sm text-slate-400">/100</p>
              </div>
              <div className="mt-2">
                <StatusPill label={healthState} tone={healthTone} />
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 sm:p-6">
        <SectionHeader
          eyebrow="Portfolio Allocation + Performance"
          title="Portfolio Allocation & Performance"
          subtitle="A single view of what you own and how balanced it is"
        />

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="v2-tile rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div
                className="relative w-44 h-44 rounded-full shrink-0"
                style={{ background: donutGradient }}
                role="img"
                aria-label="Portfolio allocation donut chart"
              >
                <div className="absolute inset-[18%] rounded-full bg-[#0f1220] border border-white/10 flex items-center justify-center text-center px-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Diversification</p>
                    <p className="mt-1 text-2xl font-bold text-white">{Math.round(diversificationScore)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-2.5 w-full" role="list" aria-label="Asset allocation breakdown">
                {allocationSlices.map((slice) => (
                  <div key={slice.label} className="flex items-center gap-2 text-xs" role="listitem">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
                    <span className="text-slate-300">{slice.label}</span>
                    <span className="ml-auto font-semibold text-white tabular-nums">{slice.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="v2-tile rounded-xl">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Largest Exposure</p>
              <p className="mt-2 text-lg font-semibold text-white">{largestExposure?.label ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-400">{largestExposure?.value?.toFixed(1) ?? "0.0"}% of portfolio</p>
            </div>
            <div className="v2-tile rounded-xl">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Top Holding</p>
              <p className="mt-2 text-lg font-semibold text-white truncate">{topHolding?.name ?? "No holdings"}</p>
              <p className="mt-1 text-xs text-slate-400">{topHolding ? fmt(topHolding.value ?? 0) : "—"}</p>
            </div>
            <div className="v2-tile rounded-xl">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Performance</p>
              <p className={`mt-2 text-lg font-semibold ${data.executive.totalReturn >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {fmt(data.executive.totalReturn)}
              </p>
              <p className={`mt-1 text-xs ${data.executive.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmtPct(data.executive.returnPct)} unrealized
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <RuntimeErrorBoundary scope="featured-opportunities-section">
        <FeaturedOpportunitiesSection data={data} />
      </RuntimeErrorBoundary>

      <RuntimeErrorBoundary scope="property-income-occupancy-section">
        <PropertyIncomeOccupancySection data={data} />
      </RuntimeErrorBoundary>

      <RuntimeErrorBoundary scope="intelligence-widget">
        <PortfolioHealthSection state={healthState} recommendations={recommendations} />
      </RuntimeErrorBoundary>

      <RuntimeErrorBoundary scope="market-pulse-component">
        <RecentActivitySection data={data} />
      </RuntimeErrorBoundary>

      <RuntimeErrorBoundary scope="market-snapshot-section">
        <MarketSnapshotSection />
      </RuntimeErrorBoundary>
    </div>
  );
}
