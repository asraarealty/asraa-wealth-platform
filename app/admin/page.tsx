"use client";

import Link from "next/link";
import { IntelligenceCard, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
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

  const avgEquity =
    clients.length > 0
      ? clients.reduce((s, c) => s + c.allocationMix.stock, 0) / clients.length
      : 0;
  const avgMF =
    clients.length > 0
      ? clients.reduce((s, c) => s + c.allocationMix.mf, 0) / clients.length
      : 0;
  const avgRE =
    clients.length > 0
      ? clients.reduce((s, c) => s + c.allocationMix.property, 0) / clients.length
      : 0;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
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
            label="Avg Portfolio"
            value={fmt(kpis.avgPortfolioValue)}
            sub="Per client"
          />
        </div>
      </SurfaceCard>

      {/* ── Operations board + system health ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Operational Intelligence"
            title="Live operations board"
            subtitle="Transaction monitoring, property operations, and event flow"
          />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Transaction monitoring</p>
              <p className="text-lg font-semibold text-white mt-1.5">{suspendedOrInactive} accounts need review</p>
              <div className="mt-2">
                <StatusPill label={suspendedOrInactive > 0 ? "Needs action" : "Stable"} tone={suspendedOrInactive > 0 ? "warn" : "success"} />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Concentration alerts</p>
              <p className="text-lg font-semibold text-white mt-1.5">{highRiskClients} high-risk clients</p>
              <div className="mt-2">
                <StatusPill label={highRiskClients > 0 ? "Escalation active" : "All clear"} tone={highRiskClients > 0 ? "danger" : "success"} />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Property occupancy</p>
              <p className="text-lg font-semibold text-white mt-1.5">{occupancyRate.toFixed(1)}%</p>
              <div className="mt-2">
                <StatusPill label={occupancyRate >= 90 ? "Stable" : "Watch"} tone={occupancyRate >= 90 ? "success" : "warn"} />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Avg asset mix</p>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                Equity {avgEquity.toFixed(1)}% · Funds {avgMF.toFixed(1)}% · RE {avgRE.toFixed(1)}%
              </p>
              <div className="mt-2">
                <StatusPill label={highRiskClients > 0 ? "Rebalance watch" : "Balanced"} tone={highRiskClients > 0 ? "warn" : "success"} />
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="System Health" title="Runtime status" subtitle="Reliability and alerts" />
          <div className="mt-4 space-y-3">
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Platform active rate</p>
              <p className="text-lg font-semibold text-white mt-1.5">
                {clients.length > 0 ? ((kpis.activeClients * 100) / clients.length).toFixed(1) : "0.0"}%
              </p>
              <div className="mt-2">
                <StatusPill label="Operational" tone="success" />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Critical alerts</p>
              <p className="text-lg font-semibold text-white mt-1.5">{highRiskClients}</p>
              <div className="mt-2">
                <StatusPill label={highRiskClients > 0 ? "Escalated" : "Clear"} tone={highRiskClients > 0 ? "danger" : "success"} />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Onboarding queue</p>
              <p className="text-sm text-slate-300 mt-1.5">{clients.filter((c) => c.approvalStatus !== "approved").length} approvals pending</p>
              <div className="mt-2">
                <StatusPill label="Review required" tone="warn" />
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* ── AI risk signals ───────────────────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="AI Risk Intelligence"
          title="Platform-wide risk signals"
          subtitle="Automatically derived from live client portfolio data"
          action={<Link href="/admin/risk" className="v2-link">Full risk dashboard →</Link>}
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {highRiskClients > 0 ? (
            <IntelligenceCard
              title={`${highRiskClients} client${highRiskClients > 1 ? "s" : ""} with concentration risk`}
              message="Equity exposure exceeds 70% or concentration risk is flagged high. Immediate portfolio review recommended."
              tone="danger"
              confidence={0.91}
            />
          ) : (
            <IntelligenceCard
              title="No concentration risk detected"
              message="All client portfolios are within acceptable concentration limits."
              tone="success"
            />
          )}
          {occupancyRate < 85 && kpis.totalProperties > 0 && (
            <IntelligenceCard
              title="Occupancy below threshold"
              message={`Platform occupancy is ${occupancyRate.toFixed(1)}%, below the 85% target. Review vacant units for re-leasing opportunities.`}
              tone="warn"
              confidence={0.82}
            />
          )}
          {suspendedOrInactive > 0 && (
            <IntelligenceCard
              title={`${suspendedOrInactive} inactive or suspended accounts`}
              message="These accounts require operational review. Inactive portfolios may drift from target allocations without intervention."
              tone="warn"
              confidence={0.75}
            />
          )}
          {clients.filter((c) => c.approvalStatus !== "approved").length > 0 && (
            <IntelligenceCard
              title="Pending onboarding approvals"
              message={`${clients.filter((c) => c.approvalStatus !== "approved").length} client(s) awaiting approval. Risk profiles incomplete.`}
              tone="info"
            />
          )}
        </div>
      </SurfaceCard>

      {/* ── Module navigation ─────────────────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Navigation"
          title="Admin modules"
          subtitle="Dedicated admin operating environment"
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="v2-tile rounded-xl p-3 hover:bg-white/[0.05] transition-colors"
            >
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
            </Link>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
