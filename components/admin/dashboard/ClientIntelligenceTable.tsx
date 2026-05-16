"use client";

import Link from "next/link";
import type { ClientIntelligence, RiskLevel, SuggestedAction } from "./intelligenceHelpers";

const RISK_STYLES: Record<RiskLevel, string> = {
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  High: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ACTION_STYLES: Record<SuggestedAction, string> = {
  Rebalance: "bg-red-500/10 text-red-300 border-red-500/20",
  Hold: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Diversify: "bg-sky-500/10 text-sky-300 border-sky-500/20",
};

function fmtVal(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

interface Props {
  rows: ClientIntelligence[];
}

export default function ClientIntelligenceTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-2xl flex flex-col items-center justify-center gap-4 py-14 px-8 text-center">
        <p className="text-base font-semibold text-white">No clients found</p>
        <p className="text-sm text-gray-500">Add clients to see intelligence data.</p>
      </div>
    );
  }

  return (
    <div className="glass-card card-hover rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{ borderBottom: "1px solid rgba(56,189,248,0.12)" }}
            >
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gold-light whitespace-nowrap">
                Client
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-gold-light whitespace-nowrap">
                Portfolio Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-gold-light whitespace-nowrap">
                Return %
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-gold-light whitespace-nowrap">
                Risk
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gold-light whitespace-nowrap">
                Allocation (Eq / MF / RE)
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-gold-light whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.clientId}
                className="transition-colors hover:bg-white/[0.02]"
                style={{
                  borderBottom:
                    i < rows.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : undefined,
                }}
              >
                {/* Client name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "rgba(56,189,248,0.15)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56,189,248,0.2)",
                      }}
                    >
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/admin/clients`}
                        className="text-white font-medium hover:text-gold-light transition-colors"
                      >
                        {row.name}
                      </Link>
                      <p className="text-xs text-gray-500 truncate max-w-[160px]">
                        {row.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Portfolio value */}
                <td className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap">
                  {fmtVal(row.portfolioValue)}
                </td>

                {/* Return % */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span
                    className={`font-semibold ${
                      row.returnPercent >= 10
                        ? "text-emerald-400"
                        : row.returnPercent >= 6
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    +{row.returnPercent}%
                  </span>
                </td>

                {/* Risk level */}
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      RISK_STYLES[row.riskLevel]
                    }`}
                  >
                    {row.riskLevel}
                  </span>
                </td>

                {/* Asset allocation */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 min-w-[160px]">
                    {/* Stacked bar */}
                    <div className="flex h-2 w-28 rounded-full overflow-hidden shrink-0">
                      <div
                        style={{ width: `${row.equityPct}%`, background: "#38bdf8" }}
                      />
                      <div
                        style={{ width: `${row.mfPct}%`, background: "#10b981" }}
                      />
                      <div
                        style={{ width: `${row.realEstatePct}%`, background: "#3b82f6" }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {row.equityPct}% / {row.mfPct}% / {row.realEstatePct}%
                    </span>
                  </div>
                </td>

                {/* Suggested action */}
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      ACTION_STYLES[row.suggestedAction]
                    }`}
                  >
                    {row.suggestedAction}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-3 border-t border-white/[0.04] text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#38bdf8" }} />
          Equity
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#10b981" }} />
          Mutual Funds
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3b82f6" }} />
          Real Estate
        </span>
        <span className="ml-auto italic">Allocation % derived from portfolio data</span>
      </div>
    </div>
  );
}
