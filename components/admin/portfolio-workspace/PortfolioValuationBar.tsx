"use client";

import { fmtCurrency, fmtPercent } from "@/lib/formatters";

interface PortfolioValuationBarProps {
  liveValue: number;
  investedValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  realizedPnL: number;
  isRefreshing: boolean;
}

export function PortfolioValuationBar({
  liveValue,
  investedValue,
  unrealizedPnL,
  unrealizedPnLPct,
  realizedPnL,
  isRefreshing,
}: PortfolioValuationBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-sky-300/20 bg-sky-500/[0.08] p-3 text-xs md:grid-cols-6">
      <Metric label="Live value" value={fmtCurrency(liveValue)} />
      <Metric label="Invested" value={fmtCurrency(investedValue)} />
      <Metric
        label="Unrealized"
        value={`${fmtCurrency(unrealizedPnL)} (${fmtPercent(unrealizedPnLPct, true)})`}
        tone={unrealizedPnL >= 0 ? "text-emerald-200" : "text-rose-200"}
      />
      <Metric
        label="Realized"
        value={fmtCurrency(realizedPnL)}
        tone={realizedPnL >= 0 ? "text-emerald-200" : "text-rose-200"}
      />
      <Metric label="Mark-to-market" value={liveValue > 0 ? "Connected" : "Awaiting"} />
      <Metric label="Quote state" value={isRefreshing ? "Refreshing…" : "Live cache"} />
    </div>
  );
}

function Metric({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
