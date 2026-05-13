"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import AlertsPanel from "@/components/admin/dashboard/AlertsPanel";
import RecommendationCard from "@/components/admin/dashboard/RecommendationCard";
import ClientIntelligenceTable from "@/components/admin/dashboard/ClientIntelligenceTable";
import {
  type ClientIntelligence,
  deriveAlerts,
  calcAverageReturn,
} from "@/components/admin/dashboard/intelligenceHelpers";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { useEnterpriseReports } from "@/lib/hooks/useEnterpriseReports";
import { useRealEstateCategory } from "@/hooks/useRealEstateCategory";
import RealEstateCategorySwitcher from "@/components/properties/RealEstateCategorySwitcher";

export default function InsightsPage() {
  const router = useRouter();
  const { category, setCategory } = useRealEstateCategory();
  const { data, loading, refreshing, error, requiresLogin, refresh } = useEnterpriseReports({ category });

  const rows = useMemo<ClientIntelligence[]>(() => {
    if (!data) return [];
    return data.clients.map((row) => ({
      clientId: row.clientId,
      name: row.name,
      email: row.email,
      isActive: row.isActive,
      portfolioValue: row.portfolioValue,
      returnPercent: row.returnPercent,
      riskLevel: row.riskLevel,
      equityPct: row.equityPct,
      mfPct: row.mfPct,
      realEstatePct: row.realEstatePct,
      suggestedAction: row.suggestedAction,
    }));
  }, [data]);

  if (loading && !data) return <Loader />;

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/70">{error ?? "Unable to load insights."}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={refresh} className="rounded-lg border border-cyan-300/30 text-cyan-300 px-3 py-1.5 text-sm">Retry</button>
            {requiresLogin ? (
              <button type="button" onClick={() => router.replace("/login")} className="rounded-lg border border-amber-300/30 text-amber-300 px-3 py-1.5 text-sm">Sign in</button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !data.hasPortfolioData && !data.hasRealEstateData;
  const alerts = deriveAlerts(rows);
  const avgReturn = calcAverageReturn(rows);

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <p className="text-sm text-gray-400 mt-1">
          Live cross-asset portfolio intelligence with real-estate exposure and risk analytics.
        </p>
        <div className="mt-3">
          <RealEstateCategorySwitcher value={category} onChange={setCategory} />
        </div>
        {refreshing ? <p className="text-xs text-cyan-300 mt-1">Refreshing live intelligence…</p> : null}
      </div>

      {error ? (
        <div className="rounded-2xl p-4 border border-red-400/25 bg-red-500/5">
          <p className="text-sm text-red-200">{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={refresh} className="rounded-lg border border-red-300/30 text-red-200 px-3 py-1.5 text-xs font-medium">Retry</button>
            {requiresLogin ? (
              <button type="button" onClick={() => router.replace("/login")} className="rounded-lg border border-amber-300/30 text-amber-300 px-3 py-1.5 text-xs font-medium">Sign in again</button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <p className="text-sm font-semibold text-white">Onboard clients</p>
            <p className="text-xs text-white/50 mt-1">No live analytics yet. Add approved clients to start aggregation.</p>
            <Link href="/admin/clients/new" className="inline-block mt-3 text-cyan-300 text-sm">Add client →</Link>
          </div>
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <p className="text-sm font-semibold text-white">Add investments</p>
            <p className="text-xs text-white/50 mt-1">Create holdings and transactions for AUM, allocation, and return intelligence.</p>
            <Link href="/admin/assets" className="inline-block mt-3 text-cyan-300 text-sm">Manage assets →</Link>
          </div>
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <p className="text-sm font-semibold text-white">Activate real-estate ops</p>
            <p className="text-xs text-white/50 mt-1">Add property operations data for occupancy, yield, and NOI insights.</p>
            <Link href="/properties" className="inline-block mt-3 text-cyan-300 text-sm">Open properties →</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Total AUM</p>
              <p className="text-xl font-bold mt-1">{fmtCurrency(data.totalAum)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Total Invested</p>
              <p className="text-xl font-bold mt-1">{fmtCurrency(data.totalInvested)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Total Returns</p>
              <p className={`text-xl font-bold mt-1 ${data.totalReturns >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtCurrency(data.totalReturns)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Portfolio Growth</p>
              <p className={`text-xl font-bold mt-1 ${data.portfolioGrowthPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtPercent(data.portfolioGrowthPct, true)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Allocation</p>
              <p className="text-sm text-white mt-1">
                Eq {data.allocationPct.equity.toFixed(1)}% • MF {data.allocationPct.mf.toFixed(1)}% • RE {data.allocationPct.realEstate.toFixed(1)}%
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Risk Exposure</p>
              <p className="text-xl font-bold mt-1">{data.riskExposureScore.toFixed(1)} / 100</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Diversification Score</p>
              <p className="text-xl font-bold mt-1">{data.diversificationScore.toFixed(1)} / 100</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/45 uppercase tracking-widest">Real Estate Intelligence</p>
              <p className="text-sm text-white mt-1">
                Occ {data.occupancyPct !== null ? `${data.occupancyPct.toFixed(1)}%` : "N/A"} • Yield {data.rentalYieldPct !== null ? `${data.rentalYieldPct.toFixed(2)}%` : "N/A"} • NOI {data.noi !== null ? fmtCurrency(data.noi) : "N/A"}
              </p>
            </div>
          </div>

          {data.diversificationWarnings.length > 0 ? (
            <div className="glass-card rounded-2xl p-4 border border-amber-400/25">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300 mb-2">Diversification Warnings</p>
              <ul className="space-y-1 text-sm text-amber-100/90">
                {data.diversificationWarnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <AlertsPanel alerts={alerts} />

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
              Allocation Overview (Average Across Clients)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Avg Return", value: `${avgReturn >= 0 ? "+" : ""}${avgReturn}%`, color: avgReturn >= 0 ? "#10b981" : "#ef4444" },
                { label: "Avg Equity", value: `${data.allocationPct.equity.toFixed(1)}%`, color: "#C9A227" },
                { label: "Avg Mutual Funds", value: `${data.allocationPct.mf.toFixed(1)}%`, color: "#10b981" },
                { label: "Avg Real Estate", value: `${data.allocationPct.realEstate.toFixed(1)}%`, color: "#3b82f6" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl p-4 text-center glass-card"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
              Client Intelligence
            </p>
            <ClientIntelligenceTable rows={rows} />
          </div>

          {rows.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
                AI Recommendations
              </p>
              <RecommendationCard rows={rows} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
