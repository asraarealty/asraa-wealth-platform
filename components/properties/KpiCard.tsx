import { ReactNode } from "react";

export default function KpiCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold">{label}</p>
          <p className="mt-2 text-xl sm:text-2xl font-semibold text-white break-words">{value}</p>
          {hint ? <p className="text-xs text-white/45 mt-1">{hint}</p> : null}
        </div>
        {icon ? <div className="text-cyan-300/80 shrink-0">{icon}</div> : null}
      </div>
    </div>
  );
}
