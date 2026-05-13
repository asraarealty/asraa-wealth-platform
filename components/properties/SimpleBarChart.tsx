import { useMemo } from "react";

export interface ChartPoint {
  label: string;
  value: number;
}

export default function SimpleBarChart({ title, points }: { title: string; points: ChartPoint[] }) {
  const max = useMemo(() => Math.max(1, ...points.map((point) => point.value)), [points]);

  return (
    <div className="glass-card rounded-2xl p-4 border border-white/10">
      <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold mb-3">{title}</p>
      <div className="space-y-3">
        {points.map((point) => (
          <div key={`${title}-${point.label}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>{point.label}</span>
              <span>{Number(point.value).toLocaleString("en-IN")}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (point.value / max) * 100)}%`,
                  background: "linear-gradient(90deg, rgba(0,229,255,0.9), rgba(79,140,255,0.9))",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
