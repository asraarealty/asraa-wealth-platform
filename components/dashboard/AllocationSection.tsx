"use client";

import type { PortfolioFull } from "@/lib/api";
import { fmtCurrency } from "@/lib/formatters";
import { deriveAllocationFromValues } from "@/lib/utils/portfolioMath";

interface AllocationSectionProps {
  portfolio: PortfolioFull;
}

interface Segment {
  label: string;
  value: number;
  color: string;
  bg: string;
}

export default function AllocationSection({ portfolio }: AllocationSectionProps) {
  const { totalValue, stockValue, mfValue, propertyValue, commodityValue } = portfolio;
  const normalizedPct = deriveAllocationFromValues({
    stockValue,
    mfValue,
    propertyValue,
    commodityValue,
    totalValue,
  });

  const segments: Segment[] = [
    { label: "Stocks", value: stockValue, color: "#00E5FF", bg: "rgba(0,229,255,0.07)" },
    { label: "Mutual Funds", value: mfValue, color: "#00ff9f", bg: "rgba(0,255,159,0.07)" },
    { label: "Property", value: propertyValue, color: "#4F8CFF", bg: "rgba(79,140,255,0.07)" },
    { label: "Commodity", value: commodityValue, color: "#c9a227", bg: "rgba(201,162,39,0.09)" },
  ].filter((s) => s.value > 0);

  const percentageByLabel: Record<string, number> = {
    Stocks: normalizedPct?.stock ?? 0,
    "Mutual Funds": normalizedPct?.mf ?? 0,
    Property: normalizedPct?.realEstate ?? 0,
    Commodity: normalizedPct?.commodity ?? 0,
  };

  if (segments.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm text-white/35">No allocation data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stacked horizontal bar */}
      <div className="h-2 rounded-full overflow-hidden flex gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
        {segments.map((seg) => {
          const width = percentageByLabel[seg.label] ?? 0;
          return (
            <div
              key={seg.label}
              className="h-full transition-all duration-700 rounded-full"
              style={{
                width: `${width}%`,
                background: seg.color,
                boxShadow: `0 0 8px ${seg.color}66`,
              }}
              title={`${seg.label}: ${width.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Segment details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {segments.map((seg) => {
          const pct = (percentageByLabel[seg.label] ?? 0).toFixed(1);
          return (
            <div
              key={seg.label}
              className="rounded-xl p-4 hover-lift"
              style={{ background: seg.bg, border: `1px solid ${seg.color}20` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}88` }}
                />
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: seg.color }}
                >
                  {seg.label}
                </p>
              </div>
              <p className="text-xl font-bold text-white">{fmtCurrency(seg.value)}</p>
              <p className="text-xs text-white/35 mt-1">{pct}% of portfolio</p>

              {/* Mini bar */}
              <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: seg.color,
                    boxShadow: `0 0 4px ${seg.color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
