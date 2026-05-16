"use client";

import { useMemo, useState } from "react";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { EmptyBlock, LoadingBlock, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";

const FILTERS = ["all", "risk", "cashflow", "rent", "drift", "opportunity"] as const;
type Filter = (typeof FILTERS)[number];

export default function NotificationsPage() {
  const { data, isLoading, isError } = useOperatingSystemData();
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => {
    return data.typedAlerts.filter((a) => (filter === "all" ? true : a.type === filter));
  }, [data.typedAlerts, filter]);

  if (isLoading) return <LoadingBlock label="Loading notifications..." />;
  if (isError) return <EmptyBlock title="Event center unavailable" message="Could not retrieve notification signals." />;

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Notifications" title="Typed event center" subtitle="Risk, rent, drift, cashflow and opportunity intelligence" />

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`v2-filter ${filter === f ? "v2-filter-active" : ""}`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className="space-y-2">
        {items.length === 0 ? (
          <EmptyBlock title="No events" message="No events match the current filter." />
        ) : (
          items.map((item) => (
            <SurfaceCard key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.message}</p>
                </div>
                <StatusPill
                  label={item.type}
                  tone={item.type === "risk" ? "danger" : item.type === "opportunity" ? "success" : item.type === "drift" ? "warn" : "info"}
                />
              </div>
            </SurfaceCard>
          ))
        )}
      </div>
    </div>
  );
}
