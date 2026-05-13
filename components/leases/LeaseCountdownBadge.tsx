import type { LeaseStatus } from "@/lib/types/realEstate";

export default function LeaseCountdownBadge({ days, status }: { days: number; status: LeaseStatus }) {
  const isUrgent = status === "expiring" || days <= 90;
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        background: isUrgent ? "rgba(244,63,94,0.12)" : "rgba(0,229,255,0.12)",
        borderColor: isUrgent ? "rgba(244,63,94,0.35)" : "rgba(0,229,255,0.35)",
        color: isUrgent ? "#fecdd3" : "#7dd3fc",
      }}
    >
      {days <= 0 ? "Expired" : `${days} days left`}
    </span>
  );
}
