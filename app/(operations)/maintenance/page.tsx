"use client";

import { useEffect, useMemo, useState } from "react";
import MaintenanceTable from "@/components/maintenance/MaintenanceTable";
import WorkOrderTimeline from "@/components/maintenance/WorkOrderTimeline";
import { useToast } from "@/context/ToastContext";
import { fetchWorkOrderTimeline, updateMaintenanceStatus } from "@/lib/api/realEstate";
import { useMaintenanceTickets } from "@/hooks/useRealEstate";
import { useRealEstateCategory } from "@/hooks/useRealEstateCategory";
import type { MaintenanceStatus, WorkOrderTimelineEvent } from "@/lib/types/realEstate";
import { emitRealEstateDataUpdated } from "@/lib/events/realtime";
import RealEstateCategorySwitcher from "@/components/properties/RealEstateCategorySwitcher";

export default function MaintenancePage() {
  const { showToast } = useToast();
  const { category, setCategory } = useRealEstateCategory();
  const { data, loading, error, refresh } = useMaintenanceTickets(category);
  const [timeline, setTimeline] = useState<WorkOrderTimelineEvent[]>([]);
  const [updating, setUpdating] = useState(false);

  const selectedTicketId = useMemo(() => {
    const priorityScore: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const statusScore: Record<string, number> = { open: 3, in_progress: 2, resolved: 1, closed: 0 };
    const ranked = [...data].sort((a, b) => {
      const aScore = (statusScore[a.status] ?? 0) * 10 + (priorityScore[a.priority] ?? 0);
      const bScore = (statusScore[b.status] ?? 0) * 10 + (priorityScore[b.priority] ?? 0);
      return bScore - aScore;
    });
    return ranked[0]?.id;
  }, [data]);

  useEffect(() => {
    if (!selectedTicketId) {
      setTimeline([]);
      return;
    }

    const ac = new AbortController();
    fetchWorkOrderTimeline(selectedTicketId, ac.signal)
      .then((events) => setTimeline(events))
      .catch(() => setTimeline([]));

    return () => ac.abort();
  }, [selectedTicketId]);

  async function onStatusChange(ticketId: number, status: MaintenanceStatus) {
    setUpdating(true);

    try {
      await updateMaintenanceStatus(ticketId, status);
      showToast("Maintenance status updated", "success");
      emitRealEstateDataUpdated();
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update ticket", "error");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl text-white font-semibold">Maintenance Operations</h2>
        <p className="text-sm text-white/45">Ticket management, complaint tracking, vendor assignment, and work-order lifecycle</p>
      </div>
      <RealEstateCategorySwitcher value={category} onChange={setCategory} />

      {error ? (
        <div className="glass-card border border-red-400/30 rounded-2xl p-4 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()} className="text-red-200 font-semibold">Retry</button>
        </div>
      ) : null}

      {loading ? <div className="glass-card rounded-2xl border border-white/10 h-56 animate-pulse" /> : <MaintenanceTable tickets={data} onStatusChange={onStatusChange} updating={updating} />}

      <WorkOrderTimeline timeline={timeline} />
    </div>
  );
}
