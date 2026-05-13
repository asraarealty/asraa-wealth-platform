import type { WorkOrderTimelineEvent } from "@/lib/types/realEstate";
import StatusBadge from "@/components/properties/StatusBadge";

export default function WorkOrderTimeline({ timeline }: { timeline: WorkOrderTimelineEvent[] }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5">
      <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold mb-4">Work Order Timeline</p>
      <div className="space-y-4">
        {timeline.map((event) => (
          <div key={event.id} className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.5)] shrink-0" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white font-medium">{event.label}</p>
                <StatusBadge status={event.status} />
              </div>
              <p className="text-xs text-white/50 mt-1">{event.at}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
