import type {
  LeaseStatus,
  MaintenanceStatus,
  OccupancyStatus,
  RentPaymentStatus,
  TenantStatus,
} from "@/lib/types/realEstate";
import { toTitleLabel } from "@/lib/utils/realEstate";

type StatusType = OccupancyStatus | TenantStatus | LeaseStatus | RentPaymentStatus | MaintenanceStatus;

const palette: Record<string, { bg: string; border: string; color: string }> = {
  fully_occupied: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#86efac" },
  partially_occupied: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#fde68a" },
  vacant: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#fda4af" },
  active: { bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.3)", color: "#7dd3fc" },
  inactive: { bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)", color: "#d1d5db" },
  expiring: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#fde68a" },
  expired: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)", color: "#fecdd3" },
  renewed: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", color: "#bbf7d0" },
  terminated: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#fecaca" },
  paid: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#86efac" },
  pending: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#93c5fd" },
  overdue: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#fca5a5" },
  open: { bg: "rgba(147,51,234,0.12)", border: "rgba(147,51,234,0.3)", color: "#d8b4fe" },
  in_progress: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#93c5fd" },
  resolved: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#86efac" },
  closed: { bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)", color: "#d1d5db" },
};

export default function StatusBadge({ status }: { status: StatusType | string }) {
  const style = palette[status] ?? palette.inactive;
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: style.bg, borderColor: style.border, color: style.color }}
    >
      {toTitleLabel(status)}
    </span>
  );
}
