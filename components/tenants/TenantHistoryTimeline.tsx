import type { TenantDetail } from "@/lib/types/realEstate";

export default function TenantHistoryTimeline({ tenant }: { tenant: TenantDetail }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5">
      <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold mb-4">Tenant History</p>
      <div className="space-y-4">
        {tenant.history.map((event) => (
          <div key={event.id} className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.5)] shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">{event.label}</p>
              <p className="text-xs text-white/50 mt-1">
                <span className="sr-only">Occurred on </span>
                <span>{event.at}</span>
                {event.note ? <span> · {event.note}</span> : null}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
