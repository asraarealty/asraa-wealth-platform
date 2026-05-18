"use client";

import { fmtCurrency, fmtPercent } from "@/lib/formatters";

interface Segment {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface AllocationBreakdownPanelProps {
  segments: Segment[];
}

export function AllocationBreakdownPanel({ segments }: AllocationBreakdownPanelProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Allocation breakdown</p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/5">
        {segments.filter((segment) => segment.value > 0).map((segment) => (
          <div key={segment.key} className="h-full" style={{ width: `${segment.pct}%`, background: segment.color }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {segments.map((segment) => (
          <div key={segment.key} className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-2">
            <p className="text-slate-300">{segment.label}</p>
            <p className="mt-1 text-sm font-semibold text-white">{fmtCurrency(segment.value)}</p>
            <p className="text-[11px] text-slate-400">{fmtPercent(segment.pct)} allocation</p>
          </div>
        ))}
      </div>
    </div>
  );
}
