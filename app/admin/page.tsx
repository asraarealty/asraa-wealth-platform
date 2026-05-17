"use client";

import Link from "next/link";
import { MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { ADMIN_NAV_ITEMS } from "@/components/admin-os/navigation";
import { useAdminClients } from "@/lib/hooks/useAdminClients";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export default function AdminOverviewPage() {
  const { clients, kpis } = useAdminClients();
  const managedAssets = clients.reduce((sum, client) => sum + client.assets.length, 0);
  const occupancyRate =
    kpis.totalProperties > 0
      ? (clients.reduce((sum, client) => sum + client.occupiedProperties, 0) * 100) /
        Math.max(kpis.totalProperties, 1)
      : 0;
  const highRiskClients = clients.filter(
    (client) =>
      client.concentrationRisk.toLowerCase().includes("high") ||
      client.equityExposurePct > 70
  ).length;
  const suspendedOrInactive = kpis.suspendedClients + kpis.inactiveClients;
  const annualizedRunRate = clients.reduce(
    (sum, client) => sum + Math.max(client.monthlyRentIncome, 0) * 12,
    0
  );

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Admin Operations OS"
          title="Platform overview"
          subtitle="Institutional control center for analytics, operations, and system reliability"
        />

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricTile label="Total AUM" value={fmt(kpis.totalAUM)} />
          <MetricTile label="Active Clients" value={String(kpis.activeClients)} />
          <MetricTile label="Managed Assets" value={String(managedAssets)} />
          <MetricTile label="Annual Rent Run-rate" value={fmt(annualizedRunRate)} />
          <MetricTile
            label="Portfolio Avg"
            value={fmt(kpis.avgPortfolioValue)}
            change="Per client"
            positive={kpis.avgPortfolioValue >= 0}
          />
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Operational Intelligence"
            title="Live operations board"
            subtitle="Transaction monitoring, property operations, and event flow"
          />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="v2-tile rounded-xl p-3">
                <p className="text-xs text-slate-400">Transaction Monitoring</p>
                <p className="text-lg font-semibold text-white mt-1">{suspendedOrInactive} accounts need operational review</p>
                <div className="mt-2">
                  <StatusPill label={suspendedOrInactive > 0 ? "Needs action" : "Stable"} tone={suspendedOrInactive > 0 ? "warn" : "success"} />
                </div>
              </div>
              <div className="v2-tile rounded-xl p-3">
                <p className="text-xs text-slate-400">Notifications & Events</p>
                <p className="text-lg font-semibold text-white mt-1">{highRiskClients} concentration alerts</p>
                <div className="mt-2">
                  <StatusPill label={highRiskClients > 0 ? "Escalation active" : "Routing active"} tone={highRiskClients > 0 ? "warn" : "info"} />
                </div>
              </div>
              <div className="v2-tile rounded-xl p-3">
                <p className="text-xs text-slate-400">Property Operations</p>
                <p className="text-lg font-semibold text-white mt-1">{occupancyRate.toFixed(1)}% occupancy</p>
                <div className="mt-2">
                  <StatusPill label={occupancyRate >= 90 ? "Stable" : "Watch"} tone={occupancyRate >= 90 ? "success" : "warn"} />
                </div>
              </div>
              <div className="v2-tile rounded-xl p-3">
                <p className="text-xs text-slate-400">Asset Distribution</p>
                <p className="text-sm text-slate-200 mt-1">
                  Equity{" "}
                  {(clients.reduce((sum, client) => sum + client.allocationMix.stock, 0) / Math.max(clients.length, 1)).toFixed(1)}
                  % · Funds{" "}
                  {(clients.reduce((sum, client) => sum + client.allocationMix.mf, 0) / Math.max(clients.length, 1)).toFixed(1)}
                  % · Real Estate{" "}
                  {(clients.reduce((sum, client) => sum + client.allocationMix.property, 0) / Math.max(clients.length, 1)).toFixed(1)}
                  %
                </p>
                <div className="mt-2">
                  <StatusPill label={highRiskClients > 0 ? "Rebalance watch" : "Balanced"} tone={highRiskClients > 0 ? "warn" : "success"} />
                </div>
              </div>
            </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="System Health" title="Runtime status" subtitle="Reliability + alerts" />
            <div className="mt-4 space-y-3">
              <div className="v2-tile rounded-xl p-3">
                <p className="text-xs text-slate-400">Platform uptime</p>
                <p className="text-lg font-semibold text-white mt-1">
                  {clients.length > 0 ? ((kpis.activeClients * 100) / clients.length).toFixed(2) : "0.00"}%
                </p>
                <div className="mt-2">
                  <StatusPill label="Healthy" tone="success" />
                </div>
              </div>
              <div className="v2-tile rounded-xl p-3">
                <p className="text-xs text-slate-400">Operational alerts</p>
                <p className="text-lg font-semibold text-white mt-1">{highRiskClients} critical</p>
                <div className="mt-2">
                  <StatusPill label={highRiskClients > 0 ? "Escalated" : "Clear"} tone={highRiskClients > 0 ? "danger" : "success"} />
                </div>
              </div>
              <div className="v2-tile rounded-xl p-3">
                <p className="text-xs text-slate-400">User management queue</p>
                <p className="text-sm text-slate-200 mt-1">{clients.filter((client) => client.approvalStatus !== "approved").length} onboarding approvals pending</p>
                <div className="mt-2">
                  <StatusPill label="Review required" tone="warn" />
                </div>
              </div>
            </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Navigation Architecture"
          title="Admin modules"
          subtitle="Dedicated admin operating environment separate from client wealth OS"
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="v2-tile rounded-xl p-3 hover:bg-white/10 transition-colors">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-slate-400 mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
