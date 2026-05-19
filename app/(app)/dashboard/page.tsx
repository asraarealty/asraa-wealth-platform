"use client";

import dynamic from "next/dynamic";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import {
  EmptyBlock,
  ExposureBar,
  LoadingBlock,
  MetricTile,
  RiskScorePanel,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  type IntelTone,
} from "@/components/v2/ui";
import { useOperatingContext } from "@/context/OperatingContext";
import { RuntimeErrorBoundary } from "@/components/runtime/RuntimeErrorBoundary";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const IntelligenceSection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.IntelligenceSection),
  { loading: () => <DashboardSectionSkeleton /> }
);
const ActionsRecommendationsSection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.ActionsRecommendationsSection),
  { loading: () => <DashboardSectionSkeleton /> }
);
const RealEstateActivitySection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.RealEstateActivitySection),
  { loading: () => <DashboardSectionSkeleton /> }
);
const MarketDiscoverySection = dynamic(
  () => import("./lazy-sections").then((mod) => mod.MarketDiscoverySection),
  { loading: () => <DashboardSectionSkeleton /> }
);

function DashboardSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
      <div className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
    </div>
  );
}

function buildIntelCards(data: ReturnType<typeof useOperatingSystemData>["data"]) {
  const cards: { title: string; message: string; tone: IntelTone; confidence?: number }[] = [];
  const risk = data.risk ?? {};
  const concentration = risk.concentration ?? {};
  const diversification = risk.diversification ?? {};
  const inactivity = risk.inactivity ?? {};
  const { realEstate, allocation, executive } = data;

  const rentDep =
    executive.totalValue > 0
      ? ((realEstate.monthlyRent * 12) / executive.totalValue) * 100
      : 0;

  if (realEstate.overdueRent > 0) {
    cards.push({
      title: "Rent collection action required",
      message: `${realEstate.overdueRent} propert${realEstate.overdueRent > 1 ? "ies have" : "y has"} overdue rent. Follow up immediately to avoid cashflow pressure.`,
      tone: "danger",
    });
  }

  if (realEstate.dueSoonRent > 0 && realEstate.overdueRent === 0) {
    cards.push({
      title: "Upcoming rent collections",
      message: `${realEstate.dueSoonRent} propert${realEstate.dueSoonRent > 1 ? "ies have" : "y has"} rent due within 5 days. Prepare collection workflows.`,
      tone: "warn",
    });
  }

  if (allocation.property > 60) {
    cards.push({
      title: "High real estate concentration",
      message: `Real estate represents ${allocation.property.toFixed(1)}% of portfolio. Diversification into liquid equity or mutual funds is recommended to reduce concentration risk.`,
      tone: "warn",
      confidence: 0.84,
    });
  }

  if (rentDep > 55) {
    cards.push({
      title: "Rental income dependency elevated",
      message: `Rental income covers ${rentDep.toFixed(0)}% of total portfolio income. Reducing dependence through equity SIPs or debt instruments is advisable.`,
      tone: "warn",
      confidence: 0.79,
    });
  }

  if (inactivity?.level === "high") {
    cards.push({
      title: "Portfolio inactivity detected",
      message: `${inactivity.label ?? "Portfolio has low activity"}. Consider reviewing allocation drift and rebalancing to maintain target risk profile.`,
      tone: "warn",
      confidence: 0.72,
    });
  }

  if (
    diversification?.level === "low" ||
    diversification?.level === "medium"
  ) {
    cards.push({
      title: "Diversification below target",
      message: `Diversification score ${diversification?.score ?? "—"}. Broadening across uncorrelated asset classes (commodities, international equity) would improve resilience.`,
      tone: "info",
      confidence: 0.76,
    });
  }

  if (concentration?.level === "high") {
    cards.push({
      title: "Concentration risk elevated",
      message: concentration.label ?? "Current portfolio concentration is above preferred limits.",
      tone: "warn",
      confidence: 0.78,
    });
  }

  if (executive.totalReturn >= 0 && executive.returnPct > 8) {
    cards.push({
      title: "Portfolio outperforming benchmark",
      message: `Unrealised return of ${executive.returnPct.toFixed(2)}% exceeds the 8% equity benchmark. Review for tactical profit-booking opportunities.`,
      tone: "success",
      confidence: 0.81,
    });
  }

  if (cards.length === 0) {
    cards.push({
      title: "Portfolio operating within healthy parameters",
      message: "No concentration risk, inactivity, or cashflow pressure detected. Continue monitoring for rebalancing triggers.",
      tone: "success",
    });
  }

  return cards.slice(0, 5);
}

export default function DashboardPage() {
  const { data, isLoading, isError, marketSyncNotice, refetchAll } = useOperatingSystemData();
  const { timeHorizon, riskProfile } = useOperatingContext();

  if (isLoading) return <LoadingBlock />;
  if (isError) {
    return (
      <EmptyBlock
        title="Unable to load portfolio data"
        message="Please retry to reconnect portfolio, intelligence and transaction modules."
      />
    );
  }

  const riskTone =
    data.executive.riskState === "High"
      ? "danger"
      : data.executive.riskState === "Medium"
      ? "warn"
      : "success";

  const intelCards = buildIntelCards(data);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Executive summary ──────────────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <SectionHeader
            eyebrow="Portfolio Intelligence"
            title="Wealth overview"
            subtitle={`Horizon ${timeHorizon.toUpperCase()} · Risk profile ${riskProfile}`}
          />
          <button onClick={refetchAll} className="v2-action text-xs" type="button">
            Refresh
          </button>
        </div>

        {marketSyncNotice ? (
          <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {marketSyncNotice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="Total Portfolio Value" value={fmt(data.executive.totalValue)} />
          <MetricTile label="Total Invested" value={fmt(data.executive.totalInvested)} />
          <MetricTile
            label="Unrealised P&L"
            value={fmt(data.executive.totalReturn)}
            change={`${data.executive.returnPct >= 0 ? "+" : ""}${data.executive.returnPct.toFixed(2)}%`}
            positive={data.executive.totalReturn >= 0}
          />
          <MetricTile
            label="Net Worth"
            value={fmt(data.executive.netWorth ?? data.executive.totalValue)}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetricTile
            label="Monthly Income"
            value={fmt(data.executive.monthlyIncome ?? 0)}
            sub="Rental + yield"
          />
          <div className="v2-tile rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Portfolio Risk</p>
            <div className="mt-2">
              <StatusPill label={data.executive.riskState} tone={riskTone} />
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* ── Asset allocation + Market exposure ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Asset Allocation"
            title="Portfolio composition"
            subtitle="Current holding distribution by asset class"
          />
          <div className="mt-4 space-y-3">
            {[
              { label: "Equities", val: data.allocation.stock,     color: "#3b82f6" },
              { label: "Mutual Funds", val: data.allocation.mf,    color: "#10b981" },
              { label: "Real Estate", val: data.allocation.property, color: "#8b5cf6" },
              { label: "Commodities", val: data.allocation.commodity ?? 0, color: "#f59e0b" },
            ].map((x) => (
              <ExposureBar key={x.label} label={x.label} value={x.val} color={x.color} />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Market Exposure"
            title="Exposure analysis"
            subtitle="Liquid vs. illiquid and market vs. alternative"
          />
          <div className="mt-4 space-y-3">
            {[
              {
                label: "Market exposure (equity + MF)",
                val: (data.allocation.stock ?? 0) + (data.allocation.mf ?? 0),
                color: "#3b82f6",
              },
              {
                label: "Illiquid exposure (RE + commodity)",
                val: (data.allocation.property ?? 0) + (data.allocation.commodity ?? 0),
                color: "#8b5cf6",
              },
              {
                label: "Real estate only",
                val: data.allocation.property ?? 0,
                color: "#6366f1",
              },
              {
                label: "Equity only",
                val: data.allocation.stock ?? 0,
                color: "#60a5fa",
              },
            ].map((x) => (
              <ExposureBar key={x.label} label={x.label} value={x.val} color={x.color} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <RiskScorePanel
              score={data.executive.riskState}
              label="Computed from allocation, concentration and inactivity signals"
            />
          </div>
        </SurfaceCard>
      </div>

      <RuntimeErrorBoundary scope="intelligence-widget">
        <IntelligenceSection intelCards={intelCards} />
      </RuntimeErrorBoundary>
      <ActionsRecommendationsSection data={data} />
      <RuntimeErrorBoundary scope="runtime-stream-panel">
        <RealEstateActivitySection data={data} />
      </RuntimeErrorBoundary>
      <RuntimeErrorBoundary scope="commodity-widget">
        <MarketDiscoverySection />
      </RuntimeErrorBoundary>
    </div>
  );
}
