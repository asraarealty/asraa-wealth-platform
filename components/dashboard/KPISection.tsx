"use client";

import type { PortfolioFull } from "@/lib/api";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

interface KPISectionProps {
  portfolio: PortfolioFull;
}

interface KPICardProps {
  label: string;
  value: string;
  subLabel?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon: React.ReactNode;
  delay?: number;
}

function KPICard({ label, value, subLabel, trend, trendLabel, icon, delay = 0 }: KPICardProps) {
  const trendColor =
    trend === "up"
      ? "#00ff9f"
      : trend === "down"
      ? "#ff4d6d"
      : "rgba(255,255,255,0.4)";

  const trendBg =
    trend === "up"
      ? "rgba(0,255,159,0.08)"
      : trend === "down"
      ? "rgba(255,77,109,0.08)"
      : "rgba(255,255,255,0.04)";

  const trendArrow =
    trend === "up" ? "▲" : trend === "down" ? "▼" : "";

  return (
    <div
      className="card-hover rounded-2xl p-5 flex flex-col gap-3 animate-float-up"
      style={{
        animationDelay: `${delay}s`,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(0,229,255,0.55)" }}>
          {label}
        </p>
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(0,229,255,0.08)", color: "#00E5FF" }}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-white leading-none tracking-tight">{value}</p>
      {(trendLabel || subLabel) && (
        <div className="flex items-center gap-2 text-xs">
          {trendLabel && (
            <span
              className="font-semibold px-2 py-0.5 rounded-full"
              style={{ color: trendColor, background: trendBg }}
            >
              {trendArrow} {trendLabel}
            </span>
          )}
          {subLabel && <span className="text-white/35">{subLabel}</span>}
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
  delay?: number;
}

function BreakdownCard({ label, value, percentage, color, delay = 0 }: BreakdownCardProps) {
  const pctNum = parseFloat(percentage);
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1.5 animate-float-up hover-lift"
      style={{
        animationDelay: `${delay}s`,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${color}22`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
        />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
          {label}
        </p>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-white/35">{percentage} of portfolio</p>
      {/* Mini progress bar */}
      <div className="mt-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pctNum, 100)}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
    </div>
  );
}

export default function KPISection({ portfolio }: KPISectionProps) {
  const { totalValue, stockValue, mfValue, propertyValue, commodityValue, roiPercent } = portfolio;

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
          delay={0}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
          delay={0.05}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
            </svg>
          }
        />
      </div>

      {/* Asset-type breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BreakdownCard
          label="Stocks"
          value={fmtCurrency(stockValue)}
          percentage={pct(stockValue)}
          color="#00E5FF"
          delay={0.1}
        />
        <BreakdownCard
          label="Mutual Funds"
          value={fmtCurrency(mfValue)}
          percentage={pct(mfValue)}
          color="#00ff9f"
          delay={0.15}
        />
        <BreakdownCard
          label="Property"
          value={fmtCurrency(propertyValue)}
          percentage={pct(propertyValue)}
          color="#4F8CFF"
          delay={0.2}
        />
        <BreakdownCard
          label="Commodity"
          value={fmtCurrency(commodityValue)}
          percentage={pct(commodityValue)}
          color="#c9a227"
          delay={0.25}
        />
      </div>
    </div>
  );
}
