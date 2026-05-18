"use client";

import { IntelligenceCard, LoadingBlock, MetricTile, RiskScorePanel, SectionHeader, StatusPill, SurfaceCard, ExposureBar } from "@/components/v2/ui";
import { useAdminClients } from "@/lib/hooks/useAdminClients";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export default function AdminRiskIntelligencePage() {
  const { clients, kpis, loading } = useAdminClients();

  if (loading) return <LoadingBlock label="Loading risk intelligence..." />;

  const highRisk = clients.filter(
    (c) =>
      c.concentrationRisk.toLowerCase().includes("high") || c.equityExposurePct > 70
  );
  const mediumRisk = clients.filter(
    (c) =>
      !c.concentrationRisk.toLowerCase().includes("high") &&
      c.equityExposurePct <= 70 &&
      (c.concentrationRisk.toLowerCase().includes("moderate") || c.equityExposurePct > 50)
  );
  const lowRisk = clients.filter(
    (c) =>
      !highRisk.includes(c) && !mediumRisk.includes(c)
  );

  const avgEquityExposure =
    clients.length > 0
      ? clients.reduce((s, c) => s + c.equityExposurePct, 0) / clients.length
      : 0;

  const avgRE =
    clients.length > 0
      ? clients.reduce((s, c) => s + c.allocationMix.property, 0) / clients.length
      : 0;

  const avgMF =
    clients.length > 0
      ? clients.reduce((s, c) => s + c.allocationMix.mf, 0) / clients.length
      : 0;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Risk KPIs ─────────────────────────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="AI Risk Intelligence"
          title="Platform risk dashboard"
          subtitle="Cross-client concentration, exposure and rebalancing alerts"
        />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile
            label="High-risk clients"
            value={String(highRisk.length)}
            change={highRisk.length > 0 ? "Requires attention" : "Clear"}
            positive={highRisk.length === 0}
          />
          <MetricTile
            label="Medium-risk clients"
            value={String(mediumRisk.length)}
            change="Monitoring active"
            positive={undefined}
          />
          <MetricTile
            label="Avg equity exposure"
            value={`${avgEquityExposure.toFixed(1)}%`}
            sub="Across all clients"
          />
          <MetricTile label="Total AUM monitored" value={fmt(kpis.totalAUM)} />
        </div>
      </SurfaceCard>

      {/* ── Risk distribution + Portfolio exposure ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Risk Distribution"
            title="Client risk segmentation"
            subtitle="Grouped by concentration and exposure scores"
          />
          <div className="mt-4 space-y-3">
            <RiskScorePanel
              score="High"
              label={`${highRisk.length} client${highRisk.length !== 1 ? "s" : ""} with elevated concentration or equity exposure above 70%`}
            />
            <div className="v2-tile rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Medium risk</p>
                  <p className="mt-1 text-xl font-bold text-amber-400">{mediumRisk.length}</p>
                </div>
                <StatusPill label="Monitoring" tone="warn" />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Low risk</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">{lowRisk.length}</p>
                </div>
                <StatusPill label="Healthy" tone="success" />
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Exposure Analytics"
            title="Platform-wide exposure"
            subtitle="Average allocation across all managed portfolios"
          />
          <div className="mt-4 space-y-4">
            {[
              { label: "Equities (avg)", val: avgEquityExposure, color: "#3b82f6" },
              { label: "Real Estate (avg)", val: avgRE, color: "#8b5cf6" },
              { label: "Mutual Funds (avg)", val: avgMF, color: "#10b981" },
            ].map((x) => (
              <ExposureBar key={x.label} label={x.label} value={x.val} color={x.color} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium mb-2">Concentration alerts</p>
            <div className="flex flex-wrap gap-2">
              {highRisk.length > 0 ? (
                <StatusPill label={`${highRisk.length} concentration breaches`} tone="danger" />
              ) : (
                <StatusPill label="No concentration breaches" tone="success" />
              )}
              {avgEquityExposure > 65 && (
                <StatusPill label="Platform equity exposure elevated" tone="warn" />
              )}
              {avgRE > 55 && (
                <StatusPill label="RE exposure above threshold" tone="warn" />
              )}
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* ── AI risk intelligence cards ───────────────────────────────────── */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="AI Risk Signals"
          title="Operational risk intelligence"
          subtitle="Algorithmically derived from live client portfolio data"
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {highRisk.length > 0 ? (
            <IntelligenceCard
              title={`${highRisk.length} client${highRisk.length > 1 ? "s require" : " requires"} immediate review`}
              message={`Equity exposure exceeds 70% or concentration risk is flagged high by the allocation engine. Schedule targeted portfolio rebalancing reviews.`}
              tone="danger"
              confidence={0.91}
            />
          ) : (
            <IntelligenceCard
              title="No high-risk clients detected"
              message="All managed portfolios are within acceptable concentration and exposure limits."
              tone="success"
            />
          )}
          {avgEquityExposure > 65 && (
            <IntelligenceCard
              title="Platform-wide equity concentration elevated"
              message={`Average equity exposure is ${avgEquityExposure.toFixed(1)}% across all clients. Consider systematic rebalancing toward debt and alternative assets.`}
              tone="warn"
              confidence={0.84}
            />
          )}
          {avgRE > 55 && (
            <IntelligenceCard
              title="Real estate dependency risk"
              message={`Average real estate allocation is ${avgRE.toFixed(1)}%. Illiquid concentration reduces portfolio flexibility during market stress.`}
              tone="warn"
              confidence={0.79}
            />
          )}
          {clients.filter((c) => ["lead", "onboarding", "pending_kyc", "approved"].includes(c.canonicalStatus)).length > 0 && (
            <IntelligenceCard
              title="Pending onboarding approvals"
              message={`${clients.filter((c) => ["lead", "onboarding", "pending_kyc", "approved"].includes(c.canonicalStatus)).length} client${clients.filter((c) => ["lead", "onboarding", "pending_kyc", "approved"].includes(c.canonicalStatus)).length > 1 ? "s" : ""} awaiting lifecycle progression. Risk profiles are incomplete until onboarding is finalised.`}
              tone="info"
            />
          )}
          <IntelligenceCard
            title="Inactivity monitoring active"
            message={`${kpis.onboardingClients} client${kpis.onboardingClients !== 1 ? "s" : ""} still in onboarding lifecycle states. Passive portfolios may drift from target allocation without intervention.`}
            tone={kpis.onboardingClients > 0 ? "warn" : "success"}
            confidence={0.72}
          />
        </div>
      </SurfaceCard>

      {/* ── High-risk client list ─────────────────────────────────────────── */}
      {highRisk.length > 0 && (
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Escalation Queue"
            title="High-risk client roster"
            subtitle="Clients requiring immediate portfolio review or rebalancing"
          />
          <div className="mt-4 space-y-2">
            {highRisk.map((client) => (
              <div key={client.id} className="v2-tile rounded-xl p-3 flex flex-wrap items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L11 10H1L6 1Z" stroke="#f87171" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M6 4.5V7" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="6" cy="8.5" r="0.5" fill="#f87171" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{client.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Equity: {client.equityExposurePct.toFixed(0)}% · {client.concentrationRisk}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-xs text-slate-400">{fmt(client.totalNetWorth)}</p>
                  <StatusPill label="Review" tone="danger" />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
