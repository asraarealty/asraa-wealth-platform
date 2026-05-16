"use client";

import Link from "next/link";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { EmptyBlock, LoadingBlock, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { useOperatingContext } from "@/context/OperatingContext";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetchAll } = useOperatingSystemData();
  const { timeHorizon, riskProfile } = useOperatingContext();

  if (isLoading) return <LoadingBlock />;

  if (isError) {
    return (
      <EmptyBlock title="Unable to load operating data" message="Please retry to reconnect portfolio, intelligence and transaction modules." />
    );
  }

  const riskTone = data.executive.riskState === "High" ? "danger" : data.executive.riskState === "Medium" ? "warn" : "success";

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Portfolio Intelligence"
          title="Mission control"
          subtitle={`Horizon ${timeHorizon.toUpperCase()} · Risk profile ${riskProfile}`}
          action={
            <button onClick={refetchAll} className="v2-action" type="button">
              Refresh
            </button>
          }
        />

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="Total Value" value={fmt(data.executive.totalValue)} />
          <MetricTile label="Total Invested" value={fmt(data.executive.totalInvested)} />
          <MetricTile
            label="Net Return"
            value={fmt(data.executive.totalReturn)}
            change={`${data.executive.returnPct >= 0 ? "+" : ""}${data.executive.returnPct.toFixed(2)}%`}
            positive={data.executive.totalReturn >= 0}
          />
          <div className="v2-tile rounded-xl flex flex-col justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Risk State</p>
            <div className="mt-2">
              <StatusPill label={data.executive.riskState} tone={riskTone} />
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-2 gap-3">
          <MetricTile label="Monthly Income" value={fmt(data.executive.monthlyIncome ?? 0)} />
          <MetricTile label="Net Worth" value={fmt(data.executive.netWorth ?? data.executive.totalValue)} />
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Priority Actions"
            title="What needs action now"
            subtitle="AI and operations aligned by urgency"
          />
          <div className="mt-4 flex gap-3 overflow-x-auto snap-x no-scrollbar">
            {data.priorityActions.map((action) => (
              <article key={action.id} className="min-w-[260px] snap-start v2-tile rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{action.title}</p>
                  <StatusPill
                    label={action.severity.toUpperCase()}
                    tone={action.severity === "high" ? "danger" : action.severity === "medium" ? "warn" : "info"}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{action.description}</p>
              </article>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Allocation" title="Asset mix" subtitle="Data-driven allocation intelligence" />
          <div className="mt-4 space-y-3">
            {[
              { label: "Stocks", val: data.allocation.stock, color: "#38bdf8" },
              { label: "Mutual Funds", val: data.allocation.mf, color: "#34d399" },
              { label: "Property", val: data.allocation.property, color: "#a78bfa" },
              { label: "Commodities", val: data.allocation.commodity ?? 0, color: "#f59e0b" },
            ].map((x) => (
              <div key={x.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{x.label}</span>
                  <span className="text-white font-semibold">{x.val.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, x.val))}%`, background: x.color }} />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Activity + Transactions"
            title="Operational timeline"
            subtitle="Cross-domain event stream from assets, properties and intelligence"
            action={<Link href="/activity" className="v2-link">View full feed</Link>}
          />
          <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {data.activityFeed.slice(0, 8).map((event) => (
              <div key={event.id} className="v2-tile rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <StatusPill
                    label={event.type}
                    tone={event.type === "risk" ? "danger" : event.type === "opportunity" ? "success" : event.type === "drift" ? "warn" : "info"}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{event.message}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Predictive Intelligence" title="Next-best actions" subtitle="Confidence-ranked recommendations" />
          <div className="mt-4 space-y-2">
            {data.recommendations.length === 0 ? (
              <p className="text-xs text-slate-400">No predictive actions currently flagged.</p>
            ) : (
              data.recommendations.map((r) => (
                <div key={r.id} className="v2-tile rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{r.title}</p>
                    <span className="text-[11px] text-sky-300 font-semibold">{Math.round(r.confidence * 100)}%</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{r.rationale}</p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Real Estate Operations"
          title="Property health snapshot"
          subtitle="Rent pipeline, occupancy and cashflow at a glance"
          action={<Link href="/real-estate" className="v2-link">Full ops →</Link>}
        />
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="RE Asset Value" value={fmt(data.realEstate.totalValue)} />
          <MetricTile label="Monthly Rent" value={fmt(data.realEstate.monthlyRent)} />
          <MetricTile label="Occupied Units" value={String(data.realEstate.occupied)} />
          <div className="v2-tile rounded-xl flex flex-col justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Rent Alerts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.realEstate.overdueRent > 0 && (
                <StatusPill label={`${data.realEstate.overdueRent} overdue`} tone="danger" />
              )}
              {data.realEstate.dueSoonRent > 0 && (
                <StatusPill label={`${data.realEstate.dueSoonRent} due soon`} tone="warn" />
              )}
              {data.realEstate.overdueRent === 0 && data.realEstate.dueSoonRent === 0 && (
                <StatusPill label="All clear" tone="success" />
              )}
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
