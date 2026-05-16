"use client";

import type { PortfolioData } from "@/lib/mappers/mapPortfolio";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

interface KPISectionProps {
  portfolio: PortfolioData;
}

interface KPICardProps {
  label: string;
  value: string;
  subLabel?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon: React.ReactNode;
}

function KPICard({ label, value, subLabel, trend, trendLabel, icon }: KPICardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-gray-400";

  const trendArrow =
    trend === "up" ? "▲" : trend === "down" ? "▼" : "";

  return (
    <div className="glass-card card-hover rounded-2xl p-5 flex flex-col gap-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-light">
          {label}
        </p>
        <span className="text-gold opacity-70">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {(trendLabel || subLabel) && (
        <div className="flex items-center gap-2 text-xs">
          {trendLabel && (
            <span className={`font-semibold ${trendColor}`}>
              {trendArrow} {trendLabel}
            </span>
          )}
          {subLabel && <span className="text-gray-500">{subLabel}</span>}
        </div>
      )}
    </div>
  );
}

interface BreakdownCardProps {
  label: string;
  value: string;
  percentage: string;
  color: string;
}

function BreakdownCard({ label, value, percentage, color }: BreakdownCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1.5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
          {label}
        </p>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500">{percentage} of portfolio</p>
    </div>
  );
}

export default function KPISection({ portfolio }: KPISectionProps) {
  const { totalValue, stockValue, mfValue, propertyValue, roiPercent } = portfolio;

  const roiTrend: "up" | "down" | "neutral" =
    roiPercent > 0 ? "up" : roiPercent < 0 ? "down" : "neutral";

  const pct = (val: number) =>
    totalValue > 0 ? `${((val / totalValue) * 100).toFixed(1)}%` : "0%";

  return (
    <div className="space-y-4">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard
          label="Total Portfolio Value"
          value={fmtCurrency(totalValue)}
          subLabel="current market value"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          }
        />
        <KPICard
          label="Overall ROI"
          value={fmtPercent(roiPercent, true)}
          trend={roiTrend}
          trendLabel={roiPercent >= 0 ? "Profit" : "Loss"}
          subLabel="all time return"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
            </svg>
          }
        />
      </div>

      {/* Asset-type breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <BreakdownCard
          label="Stocks"
          value={fmtCurrency(stockValue)}
          percentage={pct(stockValue)}
          color="#38bdf8"
        />
        <BreakdownCard
          label="Mutual Funds"
          value={fmtCurrency(mfValue)}
          percentage={pct(mfValue)}
          color="#2ecc71"
        />
        <BreakdownCard
          label="Property"
          value={fmtCurrency(propertyValue)}
          percentage={pct(propertyValue)}
          color="#3498db"
        />
      </div>
    </div>
  );
}
