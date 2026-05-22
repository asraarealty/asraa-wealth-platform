"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { IntelligenceCard, LoadingBlock, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { useAdminClients } from "@/lib/hooks/useAdminClients";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

const AllocationRing = dynamic(
  () => import("@/components/admin/platform/AllocationRing").then((mod) => mod.AllocationRing),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading allocation chart..." />,
  }
);

const AdminMarketPanel = dynamic(
  () => import("@/components/admin-os/AdminMarketPanel").then((mod) => mod.AdminMarketPanel),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading market overlay..." />,
  }
);

function toneForStatus(value: string): "success" | "warn" | "danger" | "info" {
  const normalized = value.toLowerCase();
  if (["approved", "active", "live"].includes(normalized)) return "success";
  if (["pending", "review", "inactive"].includes(normalized)) return "warn";
  if (["suspended", "rejected", "archived"].includes(normalized)) return "danger";
  return "info";
}

export default function AdminOverviewPage() {
  const { clients, kpis, loading, error } = useAdminClients();
  const safeClients = loading ? [] : clients;

  const totalAssets = safeClients.reduce((sum, client) => sum + client.assets.length, 0);
  const pendingApprovals = safeClients.filter((client) => client.approvalStatus !== "approved");
  const recentActivity = [...safeClients]
    .filter((client) => client.lastActivity)
    .sort((a, b) => new Date(String(b.lastActivity)).getTime() - new Date(String(a.lastActivity)).getTime())
    .slice(0, 6);
  const topClients = [...safeClients].sort((a, b) => b.totalNetWorth - a.totalNetWorth).slice(0, 6);
  const avgEquity = safeClients.length ? safeClients.reduce((sum, client) => sum + client.allocationMix.stock, 0) / safeClients.length : 0;
  const avgFunds = safeClients.length ? safeClients.reduce((sum, client) => sum + client.allocationMix.mf, 0) / safeClients.length : 0;
  const avgProperty = safeClients.length ? safeClients.reduce((sum, client) => sum + client.allocationMix.property, 0) / safeClients.length : 0;
  const avgCommodity = safeClients.length ? safeClients.reduce((sum, client) => sum + client.allocationMix.commodity, 0) / safeClients.length : 0;
  const avgPerformance = safeClients.length ? safeClients.reduce((sum, client) => sum + client.unrealizedPnLPct, 0) / safeClients.length : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Admin control center"
          title="Live wealth operating system"
          subtitle="Realtime client operations, market pulse, asset allocation, and approval oversight in one admin surface"
          action={<Link href="/admin/onboarding" className="v2-link">Open onboarding command center →</Link>}
        />
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Total clients" value={String(kpis.totalClients)} />
          <MetricTile label="Total AUM" value={fmtCurrency(kpis.totalAUM)} />
          <MetricTile label="Tracked assets" value={String(totalAssets)} sub="Across all client books" />
          <MetricTile label="Avg performance" value={fmtPercent(avgPerformance, true)} positive={avgPerformance >= 0} sub="Unrealized return" />
          {loading ? <LoadingBlock label="Loading admin metrics..." /> : null}
        </div>
      </SurfaceCard>

      <AdminMarketPanel />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Client table" title="Largest client books" subtitle="Top live portfolios from the admin backend" />
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">AUM</th>
                  <th className="px-3 py-2">Performance</th>
                  <th className="px-3 py-2">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client) => (
                  <tr key={client.id} className="border-t border-white/[0.06]">
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-white">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill label={client.status} tone={toneForStatus(client.status)} />
                        <StatusPill label={client.approvalStatus} tone={toneForStatus(client.approvalStatus)} />
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-white">{fmtCurrency(client.totalNetWorth)}</td>
                    <td className="px-3 py-3 align-top">
                      <span className={client.unrealizedPnLPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {fmtPercent(client.unrealizedPnLPct, true)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-400">
                      Eq {client.allocationMix.stock.toFixed(0)}% · MF {client.allocationMix.mf.toFixed(0)}% · RE {client.allocationMix.property.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Allocation overview" title="Average allocation mix" subtitle="Cross-client exposure composition" />
          <div className="mt-4">
            <AllocationRing
              segments={[
                { label: "Equity", value: avgEquity, color: "#38bdf8" },
                { label: "Funds", value: avgFunds, color: "#818cf8" },
                { label: "Property", value: avgProperty, color: "#22c55e" },
                { label: "Commodity", value: avgCommodity, color: "#f59e0b" },
              ]}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <IntelligenceCard title="Asset distribution" message={`Equity and funds account for ${(avgEquity + avgFunds).toFixed(1)}% of the average client mix, while alternatives hold ${(avgProperty + avgCommodity).toFixed(1)}%.`} tone="info" confidence={0.81} />
            <IntelligenceCard title="Portfolio performance" message={`Average unrealized performance across the admin book is ${fmtPercent(avgPerformance, true)} with ${kpis.activeClients} active clients contributing to AUM.`} tone={avgPerformance >= 0 ? "success" : "warn"} confidence={0.77} />
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-1">
          <SectionHeader eyebrow="Recent activity" title="Client activity stream" subtitle="Latest backend-backed engagement signals" />
          <div className="mt-4 space-y-3">
            {recentActivity.map((client) => (
              <div key={client.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{client.name}</p>
                  <p className="text-[11px] text-slate-500">{new Date(String(client.lastActivity)).toLocaleDateString("en-IN")}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">{client.activitySignal}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5 xl:col-span-1">
          <SectionHeader eyebrow="Approval queue" title="Pending decisions" subtitle="Clients awaiting admin action" />
          <div className="mt-4 space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
                All client approvals are current.
              </div>
            ) : (
              pendingApprovals.slice(0, 6).map((client) => (
                <div key={client.id} className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{client.name}</p>
                    <StatusPill label={client.approvalStatus} tone={toneForStatus(client.approvalStatus)} />
                  </div>
                  <p className="mt-1 text-xs text-amber-100">Onboarding {client.onboardingStatus || "pending"} · {client.riskProfile || "Risk profile pending"}</p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5 xl:col-span-1">
          <SectionHeader eyebrow="Portfolio performance" title="Performance leaders" subtitle="Highest unrealized return clients" />
          <div className="mt-4 space-y-3">
            {[...safeClients].sort((a, b) => b.unrealizedPnLPct - a.unrealizedPnLPct).slice(0, 6).map((client) => (
              <div key={client.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{client.name}</p>
                  <p className={client.unrealizedPnLPct >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>
                    {fmtPercent(client.unrealizedPnLPct, true)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{fmtCurrency(client.totalNetWorth)} · {client.topHoldingName || "Diversified book"}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
