"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { useEnterpriseReports } from "@/lib/hooks/useEnterpriseReports";
import type { EnterpriseClientReport } from "@/lib/types/enterpriseReports";

const SimpleBarChart = dynamic(() => import("@/components/properties/SimpleBarChart"), {
  ssr: false,
});

const REPORT_CLIENT_TABLE_PAGE_SIZE = 12;
const RISK_FILTER_OPTIONS = ["all", "Low", "Medium", "High"] as const;
type RiskFilter = (typeof RISK_FILTER_OPTIONS)[number];

function isRiskFilter(value: string): value is RiskFilter {
  return (RISK_FILTER_OPTIONS as readonly string[]).includes(value);
}

function card(label: string, value: string, hint?: string) {
  return (
    <div className="glass-card rounded-2xl p-4 border border-white/10">
      <p className="text-xs uppercase tracking-widest text-white/45 font-semibold">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      {hint ? <p className="text-xs text-white/45 mt-1">{hint}</p> : null}
    </div>
  );
}

function toTextValue(value: number | null) {
  return value === null ? "N/A" : fmtCurrency(value);
}

function downloadTSV(rows: EnterpriseClientReport[]) {
  const header = [
    "Client",
    "Email",
    "Holdings",
    "Transactions",
    "Total Invested",
    "Portfolio Value",
    "Gains/Losses",
    "Return%",
    "CAGR%",
    "XIRR%",
    "Risk Level",
    "Risk Score",
    "Diversification Score",
    "Equity%",
    "MF%",
    "RE%",
    "Commodity%",
    "Suggested Action",
  ];

  const body = rows.map((row) => [
    row.name,
    row.email,
    row.holdings,
    row.transactions,
    row.totalInvested.toFixed(2),
    row.portfolioValue.toFixed(2),
    row.gainsLosses.toFixed(2),
    row.returnPercent.toFixed(2),
    row.cagr?.toFixed(2) ?? "",
    row.xirr?.toFixed(2) ?? "",
    row.riskLevel,
    row.riskScore.toFixed(1),
    row.diversificationScore.toFixed(1),
    row.equityPct.toFixed(1),
    row.mfPct.toFixed(1),
    row.realEstatePct.toFixed(1),
    row.commodityPct.toFixed(1),
    row.suggestedAction,
  ]);

  const tsv = [header, ...body].map((line) => line.join("\t")).join("\n");
  const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `asraa-enterprise-reports-${new Date().toISOString().slice(0, 10)}.tsv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ClientIntelligenceVirtualTable({ rows }: { rows: EnterpriseClientReport[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / REPORT_CLIENT_TABLE_PAGE_SIZE));
  const boundedPage = Math.min(page, totalPages);
  const pageRows = rows.slice(
    (boundedPage - 1) * REPORT_CLIENT_TABLE_PAGE_SIZE,
    boundedPage * REPORT_CLIENT_TABLE_PAGE_SIZE
  );

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {["Client", "Holdings", "Txns", "Invested", "Value", "Gain/Loss", "Return", "CAGR/XIRR", "Risk", "Allocation", "Recommendations"].map((head) => (
                <th key={head} className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-white/55 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.clientId} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] align-top">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{row.name}</p>
                  <p className="text-xs text-white/50">{row.email}</p>
                </td>
                <td className="px-4 py-3 text-white/80">{row.holdings}</td>
                <td className="px-4 py-3 text-white/80">{row.transactions}</td>
                <td className="px-4 py-3 text-white">{fmtCurrency(row.totalInvested)}</td>
                <td className="px-4 py-3 text-white">{fmtCurrency(row.portfolioValue)}</td>
                <td className={`px-4 py-3 ${row.gainsLosses >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtCurrency(row.gainsLosses)}
                </td>
                <td className={`px-4 py-3 ${row.returnPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtPercent(row.returnPercent, true)}
                </td>
                <td className="px-4 py-3 text-white/80">
                  <p>{row.cagr !== null ? `${row.cagr.toFixed(2)}%` : "N/A"}</p>
                  <p className="text-xs text-white/45">{row.xirr !== null ? `${row.xirr.toFixed(2)}%` : "N/A"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white">{row.riskLevel}</p>
                  <p className="text-xs text-white/45">Score: {row.riskScore.toFixed(1)}</p>
                </td>
                <td className="px-4 py-3 text-xs text-white/70 whitespace-nowrap">
                  Eq {row.equityPct.toFixed(1)} / MF {row.mfPct.toFixed(1)} / RE {row.realEstatePct.toFixed(1)} / Co {row.commodityPct.toFixed(1)}
                </td>
                <td className="px-4 py-3">
                  <p className="text-cyan-300 text-xs font-medium">{row.suggestedAction}</p>
                  <p className="text-[11px] text-white/50 mt-1 max-w-[260px]">{row.recommendations[0]}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs">
        <span className="text-white/50">
          Showing {(boundedPage - 1) * REPORT_CLIENT_TABLE_PAGE_SIZE + (pageRows.length > 0 ? 1 : 0)}-
          {(boundedPage - 1) * REPORT_CLIENT_TABLE_PAGE_SIZE + pageRows.length} of {rows.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2.5 py-1 rounded border border-white/15 text-white/70 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={boundedPage <= 1}
          >
            Prev
          </button>
          <span className="text-white/70">{boundedPage} / {totalPages}</span>
          <button
            type="button"
            className="px-2.5 py-1 rounded border border-white/15 text-white/70 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={boundedPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [printMode, setPrintMode] = useState(false);
  const { data, loading, refreshing, error, requiresLogin, refresh } = useEnterpriseReports();

  const filteredClients = useMemo(() => {
    if (!data) return [];
    if (riskFilter === "all") return data.clients;
    return data.clients.filter((row) => row.riskLevel === riskFilter);
  }, [data, riskFilter]);

  if (loading && !data) return <Loader />;

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Enterprise Reports</h1>
        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/70">{error ?? "Unable to load reports."}</p>
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

  return (
    <div className={`space-y-6 ${printMode ? "print-mode" : ""}`}>
      <div className="sticky top-0 z-20 backdrop-blur-md bg-[#050b18]/90 border border-white/10 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Enterprise Reports</h1>
          <p className="text-xs text-white/50">Live portfolio + real-estate intelligence</p>
        </div>
        {refreshing ? <span className="text-xs text-cyan-300 ml-auto">Refreshing…</span> : null}
        <select
          className="ml-auto bg-transparent border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white"
          value={riskFilter}
          onChange={(event) => {
            const value = event.target.value;
            if (isRiskFilter(value)) setRiskFilter(value);
          }}
        >
          <option value="all" className="bg-slate-900">All Risk</option>
          <option value="Low" className="bg-slate-900">Low</option>
          <option value="Medium" className="bg-slate-900">Medium</option>
          <option value="High" className="bg-slate-900">High</option>
        </select>
        <button type="button" onClick={() => downloadTSV(filteredClients)} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80">TSV</button>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80">PDF</button>
        <button
          type="button"
          aria-pressed={printMode}
          onClick={() => setPrintMode((value) => !value)}
          className={`rounded-lg border px-3 py-1.5 text-sm ${printMode ? "border-cyan-300/50 text-cyan-300" : "border-white/15 text-white/80"}`}
        >
          Print Mode
        </button>
      </div>

      {error ? (
        <div className="glass-card border border-red-400/30 rounded-2xl p-4 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={refresh} className="text-red-200 font-semibold">Retry</button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <p className="text-sm font-semibold text-white">Start Portfolio Onboarding</p>
            <p className="text-xs text-white/50 mt-1">Add clients and holdings to generate live AUM and performance reports.</p>
            <Link href="/admin/clients/new" className="inline-block mt-3 text-cyan-300 text-sm">Add first client →</Link>
          </div>
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <p className="text-sm font-semibold text-white">Connect Investment Assets</p>
            <p className="text-xs text-white/50 mt-1">Create holdings and transactions to unlock allocation, CAGR, and XIRR analytics.</p>
            <Link href="/admin/assets" className="inline-block mt-3 text-cyan-300 text-sm">Add assets →</Link>
          </div>
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <p className="text-sm font-semibold text-white">Activate Real Estate Ops</p>
            <p className="text-xs text-white/50 mt-1">Add properties, leases, and rent records for occupancy and NOI intelligence.</p>
            <Link href="/properties" className="inline-block mt-3 text-cyan-300 text-sm">Open operations →</Link>
          </div>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Executive Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {card("Total AUM", fmtCurrency(data.totalAum))}
              {card("Total Invested", fmtCurrency(data.totalInvested))}
              {card("Total Returns", fmtCurrency(data.totalReturns))}
              {card("Portfolio Growth", fmtPercent(data.portfolioGrowthPct, true))}
              {card("Occupancy", data.occupancyPct === null ? "N/A" : `${data.occupancyPct.toFixed(1)}%`)}
              {card("Rental Yield", data.rentalYieldPct === null ? "N/A" : `${data.rentalYieldPct.toFixed(2)}%`)}
              {card("NOI", toTextValue(data.noi))}
              {card("Risk Exposure", `${data.riskExposureScore.toFixed(1)} / 100`, `${data.diversificationScore.toFixed(1)} diversification`)}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Client Portfolio Reports</h2>
            <ClientIntelligenceVirtualTable rows={filteredClients} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Investment Reports</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <SimpleBarChart title="Allocation % Distribution" points={data.allocationSeries} />
              <SimpleBarChart title="Risk Distribution" points={data.riskSeries} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Real Estate Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {card("Properties", String(data.realEstate.properties))}
              {card("Leases", String(data.realEstate.leases))}
              {card("Vacant Units", String(data.realEstate.vacantUnits))}
              {card("Lease Expiry Alerts", String(data.realEstate.leaseExpiring + data.realEstate.leaseExpired))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Rent Collection Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {card("Collected", toTextValue(data.realEstate.rentCollected))}
              {card("Pending", toTextValue(data.realEstate.pendingRent))}
              {card("Overdue", toTextValue(data.realEstate.overdueRent))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Lease Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {card("Total Leases", String(data.realEstate.leases))}
              {card("Expiring", String(data.realEstate.leaseExpiring))}
              {card("Expired", String(data.realEstate.leaseExpired))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Maintenance Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {card("Open", String(data.realEstate.maintenanceOpen))}
              {card("In Progress", String(data.realEstate.maintenanceInProgress))}
              {card("Resolved", String(data.realEstate.maintenanceResolved))}
              {card("Maintenance Cost", toTextValue(data.realEstate.maintenanceCosts))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">Tax Reports</h2>
            <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-white/70">
              Tax-ready metrics are generated from live invested value ({fmtCurrency(data.totalInvested)}), gains/losses ({fmtCurrency(data.totalReturns)}), and rent income ({toTextValue(data.realEstate.rentCollected)}).
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-light">AI Intelligence Reports</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <SimpleBarChart title="Performance Graph" points={data.performanceSeries} />
              <SimpleBarChart title="Cashflow Forecast" points={data.cashflowSeries} />
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest text-white/45 font-semibold mb-3">Occupancy Heatmap</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                {data.occupancyHeatmap.map((point) => (
                  <div
                    key={point.label}
                    className="rounded-lg p-2 border text-xs"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      background:
                        point.occupancyPct >= 90
                          ? "rgba(16,185,129,0.15)"
                          : point.occupancyPct >= 50
                            ? "rgba(245,158,11,0.15)"
                            : "rgba(239,68,68,0.15)",
                    }}
                  >
                    <p className="text-white truncate">{point.label}</p>
                    <p className="text-white/60 mt-1">{point.occupancyPct.toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>
            {data.diversificationWarnings.length > 0 ? (
              <div className="glass-card rounded-2xl border border-amber-400/20 p-4">
                <p className="text-amber-300 text-xs uppercase tracking-widest font-semibold mb-2">Diversification Warnings</p>
                <ul className="space-y-1 text-sm text-amber-100/90">
                  {data.diversificationWarnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
