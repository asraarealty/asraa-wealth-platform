import { fmtPercent } from "@/lib/formatters";

export interface AllocationSegment {
  label: string;
  value: number;
  color: string;
}

export function AllocationRing({
  segments,
  size = 132,
}: {
  segments: AllocationSegment[];
  size?: number;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  const safeSegments = total > 0 ? segments : [{ label: "Unallocated", value: 100, color: "rgba(148,163,184,0.25)" }];
  const gradient = (() => {
    let cursor = 0;
    return safeSegments
      .map((segment) => {
        const start = cursor;
        const ratio = total > 0 ? segment.value / total : 1;
        cursor += ratio * 100;
        return `${segment.color} ${start}% ${cursor}%`;
      })
      .join(", ");
  })();

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative shrink-0 rounded-full"
        style={{ width: size, height: size, background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-[16%] rounded-full border border-white/8 bg-[#071229]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Exposure</span>
          <span className="mt-1 text-lg font-semibold text-white">{total > 0 ? fmtPercent(100) : "0%"}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {safeSegments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
              <span>{segment.label}</span>
            </div>
            <span className="font-semibold text-white">{fmtPercent(segment.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
