import type { LeaseDetail } from "@/lib/types/realEstate";
import StatusBadge from "@/components/properties/StatusBadge";
import LeaseCountdownBadge from "./LeaseCountdownBadge";

export default function LeaseTimeline({ lease }: { lease: LeaseDetail }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold">Lease Timeline</p>
        <LeaseCountdownBadge days={lease.countdownDays} status={lease.status} />
      </div>
      <div className="space-y-4">
        {lease.timeline.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.5)] shrink-0" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white font-medium">{item.label}</p>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </div>
              <p className="text-xs text-white/50 mt-1">{item.at}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <p>Lock-in: <span className="text-white">{lease.lockInMonths} months</span></p>
        <p>Escalation: <span className="text-white">{lease.escalationPercent}%</span></p>
        <p>Renewal Reminder: <span className="text-white">{lease.renewalReminderDays} days</span></p>
      </div>
    </div>
  );
}
