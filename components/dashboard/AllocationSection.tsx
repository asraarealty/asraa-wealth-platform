"use client";

import type { PortfolioData } from "@/lib/mappers/mapPortfolio";

interface AllocationSectionProps {
  portfolio: PortfolioData;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

interface Segment {
  label: string;
  value: number;
  color: string;
  bg: string;
}

export default function AllocationSection({ portfolio }: AllocationSectionProps) {
  const { totalValue, stockValue, mfValue, propertyValue } = portfolio;

  const segments: Segment[] = [
    { label: "Stocks", value: stockValue, color: "#c9a227", bg: "rgba(201,162,39,0.12)" },
    { label: "Mutual Funds", value: mfValue, color: "#2ecc71", bg: "rgba(46,204,113,0.12)" },
    { label: "Property", value: propertyValue, color: "#3498db", bg: "rgba(52,152,219,0.12)" },
  ].filter((s) => s.value > 0);

  const total = totalValue > 0 ? totalValue : 1;

  if (segments.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm text-gray-500">No allocation data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stacked horizontal bar */}
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.06)" }}>
        {segments.map((seg) => {
          const width = (seg.value / total) * 100;
          return (
            <div
              key={seg.label}
              className="h-full transition-all duration-700"
              style={{ width: `${width}%`, background: seg.color }}
              title={`${seg.label}: ${((seg.value / total) * 100).toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Segment details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {segments.map((seg) => {
          const pct = ((seg.value / total) * 100).toFixed(1);
          return (
            <div
              key={seg.label}
              className="rounded-xl p-4"
              style={{ background: seg.bg, border: `1px solid ${seg.color}25` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: seg.color }}
                />
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: seg.color }}
                >
                  {seg.label}
                </p>
              </div>
              <p className="text-xl font-bold text-white">{fmtCurrency(seg.value)}</p>
              <p className="text-xs text-gray-400 mt-1">{pct}% of portfolio</p>

              {/* Mini bar */}
              <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: seg.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
