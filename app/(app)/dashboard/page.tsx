"use client";

import Link from "next/link";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
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
  AlertFeedItem,
  PropertyHealthCard,
  type IntelTone,
} from "@/components/v2/ui";
import { useOperatingContext } from "@/context/OperatingContext";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function buildIntelCards(data: ReturnType<typeof useOperatingSystemData>["data"]) {
  const cards: { title: string; message: string; tone: IntelTone; confidence?: number }[] = [];
  const { rules } = data as unknown as {
    rules?: {
      concentration?: { label: string; level: string };
      diversification?: { score: number; label: string; level: string };
      inactivity?: { days: number | null; label: string; level: string };
      exposureImbalance?: { label: string; level: string };
    };
  };
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

  if (rules?.inactivity?.level === "high") {
    cards.push({
      title: "Portfolio inactivity detected",
      message: `${rules.inactivity.label}. Consider reviewing allocation drift and rebalancing to maintain target risk profile.`,
      tone: "warn",
      confidence: 0.72,
    });
  }

  if (
    rules?.diversification?.level === "low" ||
    rules?.diversification?.level === "medium"
  ) {
    cards.push({
      title: "Diversification below target",
      message: `Diversification score ${rules.diversification?.score ?? "—"}. Broadening across uncorrelated asset classes (commodities, international equity) would improve resilience.`,
      tone: "info",
      confidence: 0.76,
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

  const topProperties = data.properties.slice(0, 4);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Executive summary ──────────────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <div className="mt-3 grid grid-cols-2 gap-3">
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

      {/* ── AI Intelligence layer ────────────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="AI Intelligence"
          title="Operational insights"
          subtitle="Contextual analysis from live portfolio, cashflow and property data"
          action={<Link href="/insights" className="v2-link">Full analysis →</Link>}
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {intelCards.map((card, i) => (
            <IntelligenceCard
              key={i}
              title={card.title}
              message={card.message}
              tone={card.tone}
              confidence={card.confidence}
            />
          ))}
        </div>
      </SurfaceCard>

      {/* ── Priority actions + Recommendations ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-3">
          <SectionHeader
            eyebrow="Priority Actions"
            title="What needs attention"
            subtitle="Ranked by urgency across portfolio, property and cashflow"
          />
          <div className="mt-4 space-y-2">
            {data.priorityActions.length === 0 ? (
              <p className="text-xs text-slate-500">No outstanding actions. Portfolio is operating normally.</p>
            ) : (
              data.priorityActions.map((action) => (
                <div key={action.id} className="v2-tile rounded-xl p-3 flex items-start gap-3">
                  <StatusPill
                    label={action.severity.toUpperCase()}
                    tone={action.severity === "high" ? "danger" : action.severity === "medium" ? "warn" : "info"}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{action.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Recommendations"
            title="Next-best actions"
            subtitle="Confidence-ranked AI suggestions"
          />
          <div className="mt-4 space-y-3">
            {data.recommendations.length === 0 ? (
              <p className="text-xs text-slate-500">No predictive actions flagged.</p>
            ) : (
              data.recommendations.map((r) => (
                <IntelligenceCard
                  key={r.id}
                  title={r.title}
                  message={r.rationale}
                  confidence={r.confidence}
                  tone="info"
                />
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* ── Real estate + Activity feed ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Property Operations"
            title="Real estate health"
            subtitle="Rent pipeline, occupancy and cashflow"
            action={<Link href="/real-estate" className="v2-link">Full ops →</Link>}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricTile label="RE Asset Value" value={fmtCompact(data.realEstate.totalValue)} />
            <MetricTile label="Monthly Rent" value={fmtCompact(data.realEstate.monthlyRent)} />
            <MetricTile label="Occupied" value={String(data.realEstate.occupied)} sub="units" />
            <MetricTile
              label="Rental Yield"
              value={`${data.realEstate.rentalYieldPct.toFixed(1)}%`}
              sub="Annual gross"
            />
          </div>

          {topProperties.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Property status</p>
              {topProperties.map((p) => {
                const isOccupied = Boolean(p.tenant_name);
                const rentStatus: "overdue" | "due-soon" | "clear" = !p.rent_due_date
                  ? "clear"
                  : (() => {
                      const diff = Math.ceil(
                        (new Date(p.rent_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
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
                    monthlyRent={
                      p.rent_amount
                        ? fmtCompact(Number(p.rent_amount))
                        : "—"
                    }
                  />
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {data.realEstate.overdueRent > 0 && (
              <StatusPill label={`${data.realEstate.overdueRent} overdue`} tone="danger" />
            )}
            {data.realEstate.dueSoonRent > 0 && (
              <StatusPill label={`${data.realEstate.dueSoonRent} due soon`} tone="warn" />
            )}
            {data.realEstate.leaseExpiry > 0 && (
              <StatusPill label={`${data.realEstate.leaseExpiry} expiring`} tone="warn" />
            )}
            {data.realEstate.overdueRent === 0 && data.realEstate.dueSoonRent === 0 && (
              <StatusPill label="Rent pipeline clear" tone="success" />
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5 xl:col-span-3">
          <SectionHeader
            eyebrow="Activity + Transactions"
            title="Operational timeline"
            subtitle="Cross-domain event stream — assets, properties, intelligence"
            action={<Link href="/activity" className="v2-link">View all →</Link>}
          />
          <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {data.activityFeed.length === 0 ? (
              <p className="text-xs text-slate-500">No recent activity recorded.</p>
            ) : (
              data.activityFeed.slice(0, 10).map((event) => (
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
      </div>
    </div>
  );
}
