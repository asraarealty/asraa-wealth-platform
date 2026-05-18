"use client";

import dynamic from "next/dynamic";
import { LoadingBlock, MetricTile, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { useAdminClients } from "@/lib/hooks/useAdminClients";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

const AllocationRing = dynamic(
  () => import("@/components/admin/platform/AllocationRing").then((mod) => mod.AllocationRing),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading allocation chart..." />,
  }
);

export default function AdminAnalyticsPage() {
  const { clients, kpis, loading, error } = useAdminClients();

  if (loading) return <LoadingBlock label="Loading analytics workspace..." />;

  const avgEquity = clients.length ? clients.reduce((sum, client) => sum + client.allocationMix.stock, 0) / clients.length : 0;
  const avgFunds = clients.length ? clients.reduce((sum, client) => sum + client.allocationMix.mf, 0) / clients.length : 0;
  const avgProperty = clients.length ? clients.reduce((sum, client) => sum + client.allocationMix.property, 0) / clients.length : 0;
  const avgCommodity = clients.length ? clients.reduce((sum, client) => sum + client.allocationMix.commodity, 0) / clients.length : 0;
  const avgReturn = clients.length ? clients.reduce((sum, client) => sum + client.unrealizedPnLPct, 0) / clients.length : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Admin analytics" title="Portfolio analytics command center" subtitle="Client concentration, allocation drift, and performance analytics across the full admin estate" />
        {error ? <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Total clients" value={String(kpis.totalClients)} />
          <MetricTile label="Managed AUM" value={fmtCurrency(kpis.totalAUM)} />
          <MetricTile label="Avg portfolio" value={fmtCurrency(kpis.avgPortfolioValue)} />
          <MetricTile label="Avg return" value={fmtPercent(avgReturn, true)} positive={avgReturn >= 0} />
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Allocation overview" title="Average client mix" subtitle="Allocation distribution across managed portfolios" />
          <div className="mt-4">
            <AllocationRing
              segments={[
                { label: "Equity", value: avgEquity, color: "#38bdf8" },
                { label: "Funds", value: avgFunds, color: "#818cf8" },
                { label: "Property", value: avgProperty, color: "#22c55e" },
                { label: "Commodities", value: avgCommodity, color: "#f59e0b" },
              ]}
            />
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Portfolio performance" title="Top client performance ladder" subtitle="Best and worst unrealized performers" />
          <div className="mt-4 space-y-3">
            {[...clients].sort((a, b) => b.unrealizedPnLPct - a.unrealizedPnLPct).slice(0, 8).map((client) => (
              <div key={client.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{client.name}</p>
                  <p className="text-xs text-slate-500">{fmtCurrency(client.totalNetWorth)} · {client.assets.length} assets</p>
                </div>
                <p className={client.unrealizedPnLPct >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>{fmtPercent(client.unrealizedPnLPct, true)}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
