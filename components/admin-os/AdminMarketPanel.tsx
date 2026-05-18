"use client";

import { LoadingBlock, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { useMarketOrchestrator } from "@/lib/services/marketOrchestrator";
import { fmtPercent } from "@/lib/formatters";

export function AdminMarketPanel() {
  const { adminTickers, isLoading, error, refresh, lastUpdated } = useMarketOrchestrator();

  if (isLoading && adminTickers.length === 0) {
    return <LoadingBlock label="Loading admin market pulse..." />;
  }

  return (
    <SurfaceCard className="p-4 sm:p-5">
      <SectionHeader
        eyebrow="Live market pulse"
        title="Admin market overview"
        subtitle={`Refresh cadence 45s · ${lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString("en-IN")}` : "Awaiting live market feed"}`}
        action={
          <button type="button" className="v2-action" onClick={() => void refresh()}>
            Refresh
          </button>
        }
      />
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {adminTickers.map((item) => (
          <div key={item.id} className="v2-tile rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.name}</p>
            <p className="mt-2 text-lg font-semibold text-white">{item.price > 0 ? item.price.toFixed(2) : "—"}</p>
            <p className={item.changePercent >= 0 ? "mt-1 text-xs text-emerald-400" : "mt-1 text-xs text-rose-400"}>
              {fmtPercent(item.changePercent, true)}
            </p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
