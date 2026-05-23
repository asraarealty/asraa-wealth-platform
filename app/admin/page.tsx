"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { LoadingBlock, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { useAdminClients } from "@/lib/hooks/useAdminClients";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { useMarketDomainGraph as useMarketOrchestrator } from "@/domains/market";

const AdminMarketMonitor = dynamic(
  () => import("@/components/admin-os/AdminMarketMonitor").then((mod) => mod.AdminMarketMonitor),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading market monitor..." />,
  }
);

function toneForStatus(value: string): "success" | "warn" | "danger" | "info" {
  const normalized = value.toLowerCase();
  if (["approved", "active", "live"].includes(normalized)) return "success";
  if (["pending", "review", "inactive"].includes(normalized)) return "warn";
  if (["suspended", "rejected", "archived"].includes(normalized)) return "danger";
  return "info";
}

function fmtDate(value?: string) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "—";
  return new Date(timestamp).toLocaleDateString("en-IN");
}

export default function AdminOverviewPage() {
  const { clients, kpis, loading, error } = useAdminClients();
  const { topLosers, error: marketError, isLoading: marketLoading, runtime } = useMarketOrchestrator();
  const safeClients = loading ? [] : clients;

  const totalAssets = safeClients.reduce((sum, client) => sum + client.assets.length, 0);
  const pendingApprovals = safeClients.filter((client) => client.approvalStatus === "pending");
  const incompleteOnboarding = safeClients.filter((client) =>
    ["lead", "onboarding", "pending_kyc", "approved"].includes(client.canonicalStatus)
  );
  const riskAlerts = safeClients.filter(
    (client) => client.concentrationRisk.toLowerCase().includes("high") || client.equityExposurePct > 70
  ).length;
  const marketAlerts =
    (runtime.staleRuntime ? 1 : 0) +
    (marketError ? 1 : 0) +
    topLosers.filter((item) => item.changePercent <= -2).length;
  const avgPerformance = safeClients.length ? safeClients.reduce((sum, client) => sum + client.unrealizedPnLPct, 0) / safeClients.length : 0;
  const activeAlerts = riskAlerts + marketAlerts;
  const topClients = [...safeClients].sort((a, b) => b.totalNetWorth - a.totalNetWorth).slice(0, 8);
  const actionCards = [
    {
      title: "Pending approvals",
      value: pendingApprovals.length,
      detail: "Review onboarding and approval queue",
      href: "/admin/transactions",
    },
    {
      title: "Incomplete onboarding",
      value: incompleteOnboarding.length,
      detail: "Clients awaiting lifecycle progression",
      href: "/admin/onboarding",
    },
    {
      title: "Risk alerts",
      value: riskAlerts,
      detail: "Concentration or exposure thresholds breached",
      href: "/admin/assets",
    },
    {
      title: "Market alerts",
      value: marketLoading ? null : marketAlerts,
      detail: "Volatility and runtime health alerts",
      href: "/admin/market",
    },
  ] as const;

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Admin control center"
          title="Overview"
          subtitle="What needs admin attention now"
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
          <MetricTile label="Pending approvals" value={String(pendingApprovals.length)} />
          <MetricTile label="Active alerts" value={loading || marketLoading ? "..." : String(activeAlerts)} />
        </div>
        {loading ? <LoadingBlock label="Loading executive summary..." /> : null}
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Operations"
          title="Admin Action Center"
          subtitle="Priority queues requiring immediate admin action"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{card.title}</p>
              <p className="mt-2 text-xl font-semibold text-white">{card.value === null ? "..." : card.value}</p>
              <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
            </Link>
          ))}
        </div>
      </SurfaceCard>

      <AdminMarketMonitor />

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Client Intelligence"
          title="Top Clients by AUM"
          subtitle="Current client books, risk posture, and operational status"
        />
        {loading ? (
          <div className="mt-4">
            <LoadingBlock label="Loading client intelligence..." />
          </div>
        ) : topClients.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-slate-400">
            No client data available yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">AUM</th>
                  <th className="px-3 py-2">Risk Profile</th>
                  <th className="px-3 py-2">Allocation</th>
                  <th className="px-3 py-2">Last Activity</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client) => (
                  <tr key={client.id} className="border-t border-white/[0.06]">
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-white">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-white">{fmtCurrency(client.totalNetWorth)}</td>
                    <td className="px-3 py-3 align-top text-slate-300">{client.riskProfile || "—"}</td>
                    <td className="px-3 py-3 align-top text-xs text-slate-400">
                      {`Eq ${client.allocationMix.stock.toFixed(0)}% · MF ${client.allocationMix.mf.toFixed(0)}% · RE ${client.allocationMix.property.toFixed(0)}%`}
                    </td>
                    <td className="px-3 py-3 align-top text-slate-300">{fmtDate(client.lastActivity)}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill label={client.status} tone={toneForStatus(client.status)} />
                        <StatusPill label={client.approvalStatus} tone={toneForStatus(client.approvalStatus)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
