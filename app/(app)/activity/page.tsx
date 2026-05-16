"use client";

import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { EmptyBlock, LoadingBlock, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";

export default function ActivityFeedPage() {
  const { data, isLoading, isError } = useOperatingSystemData();

  if (isLoading) return <LoadingBlock label="Loading activity feed..." />;
  if (isError) return <EmptyBlock title="Activity feed unavailable" message="Unable to compile cross-domain activity stream." />;

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Activity Feed"
          title="Chronological operations stream"
          subtitle="Assets, properties, transactions, and AI recommendations"
        />
      </SurfaceCard>

      <div className="space-y-2">
        {data.activityFeed.length === 0 ? (
          <EmptyBlock title="No activity yet" message="Events appear here once portfolio operations begin." />
        ) : (
          data.activityFeed.map((event) => (
            <SurfaceCard key={event.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{event.message}</p>
                  <p className="text-[11px] text-slate-500 mt-2">{new Date(event.timestamp).toLocaleString()}</p>
                </div>
                <StatusPill
                  label={event.type}
                  tone={event.type === "risk" ? "danger" : event.type === "opportunity" ? "success" : event.type === "drift" ? "warn" : "info"}
                />
              </div>
            </SurfaceCard>
          ))
        )}
      </div>
    </div>
  );
}
