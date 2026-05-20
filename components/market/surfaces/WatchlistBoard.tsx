"use client";

import { memo, useEffect, useState } from "react";
import { SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { fmtLastUpdated, fmtPercent } from "@/lib/formatters";
import {
  useMarketDomainGraph,
  usePortfolioExposure,
  useTopGainers,
  useTopLosers,
  type MarketAsset,
} from "@/domains/market";
import { RuntimeObservabilityBadges } from "@/components/runtime/RuntimeObservabilityBadges";

type WatchlistGroup = "India" | "Global" | "Fund" | "Commodity" | "Macro" | "All";
const GROUPS: WatchlistGroup[] = ["All", "India", "Global", "Fund", "Commodity", "Macro"];

function sortByMove(items: MarketAsset[]) {
  return [...items].sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent));
}

const WatchRow = memo(function WatchRow({
  item,
  onRemove,
}: {
  item: MarketAsset;
  onRemove: (symbol: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white">{item.symbol}</p>
        <p className="truncate text-[10px] text-slate-500">{item.name}</p>
      </div>
      <p className={`text-xs font-semibold tabular-nums ${item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        {fmtPercent(item.changePercent, true)}
      </p>
      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
        {item.market}
      </span>
      <button
        type="button"
        className="text-[10px] text-slate-600 transition-colors hover:text-rose-400"
        onClick={() => onRemove(item.symbol)}
        aria-label={`Remove ${item.symbol} from watchlist`}
      >
        ✕
      </button>
    </div>
  );
});

const TapeRow = memo(function TapeRow({ item }: { item: MarketAsset }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-white">{item.symbol}</p>
        <p className="truncate text-[10px] text-slate-500">{item.sector}</p>
      </div>
      <p className={`shrink-0 text-[11px] font-semibold ${item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        {fmtPercent(item.changePercent, true)}
      </p>
    </div>
  );
});

export function WatchlistBoard() {
  const {
    assets,
    watchlist,
    search,
    runtime,
    toggleWatchlist,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();
  const topGainers = useTopGainers(6);
  const topLosers = useTopLosers(6);
  const portfolioExposure = usePortfolioExposure();

  const [group, setGroup] = useState<WatchlistGroup>("All");
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setPulse((value) => !value), 3000);
    return () => clearInterval(timer);
  }, []);

  const filteredWatchlist =
    group === "All" ? watchlist : watchlist.filter((asset) => asset.market === group);

  const suggestedAssets = sortByMove(
    assets.filter((asset) => !watchlist.some((tracked) => tracked.symbol === asset.symbol))
  ).slice(0, 6);

  const watchlistTape = sortByMove(filteredWatchlist).slice(0, 6);
  const updatedAt = fmtLastUpdated(lastUpdated);

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500/20">
            <span className="text-[9px] font-bold text-emerald-300">WL</span>
            <span
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 transition-opacity ${
                pulse ? "opacity-100" : "opacity-30"
              }`}
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-400/80">Watchlist</p>
            <p className="text-[11px] text-slate-500">
              Monitoring · tracked assets · quick actions
              {updatedAt ? ` · ${updatedAt}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error ? <span className="text-[10px] text-rose-400">Feed error</span> : null}
          <button type="button" className="v2-action text-[10px]" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="border-b border-white/8 px-4 py-2.5">
        <RuntimeObservabilityBadges runtime={runtime} commodityUnavailable={search.commodityUnavailable} />
      </div>

      <div className="grid md:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
        <div className="border-r border-white/8 overflow-hidden">
          <div className="flex gap-0 overflow-x-auto border-b border-white/8">
            {GROUPS.map((item) => {
              const count = item === "All" ? watchlist.length : watchlist.filter((asset) => asset.market === item).length;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGroup(item)}
                  className={`border-b-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors whitespace-nowrap ${
                    group === item
                      ? "border-emerald-400 text-emerald-300"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {item}
                  {count > 0 ? (
                    <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-400">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="min-h-[300px] space-y-1.5 p-3">
            {isLoading && watchlist.length === 0 ? (
              <p className="pt-4 text-center text-xs text-slate-500">Loading watchlist…</p>
            ) : filteredWatchlist.length === 0 ? (
              <div className="pt-6 text-center">
                <p className="text-sm text-slate-400">No tracked assets{group !== "All" ? ` for ${group}` : ""}.</p>
                <p className="mt-1 text-xs text-slate-600">Use the suggestions below to populate the board.</p>
              </div>
            ) : (
              filteredWatchlist.map((item) => (
                <WatchRow key={item.id} item={item} onRemove={toggleWatchlist} />
              ))
            )}
          </div>

          {suggestedAssets.length > 0 ? (
            <div className="border-t border-white/8 p-3">
              <p className="mb-2 text-[9px] uppercase tracking-[0.14em] text-slate-600">Suggested from live movers</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {suggestedAssets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleWatchlist(item.symbol)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-white">{item.symbol}</p>
                    </div>
                    <p className={`shrink-0 text-[11px] ${item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {fmtPercent(item.changePercent, true)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-y-auto">
          <div className="border-b border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-emerald-400/70">Tracked Tape</p>
          </div>
          <div className="space-y-2 p-3">
            {watchlistTape.length > 0 ? (
              watchlistTape.map((item) => <TapeRow key={item.id} item={item} />)
            ) : (
              <p className="text-[11px] text-slate-500">Tracked tape will appear after assets are added.</p>
            )}
          </div>

          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Tracked Exposure</p>
          </div>
          <div className="space-y-2 p-3">
            {Object.entries(portfolioExposure.percentages).map(([label, value]) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white">{value.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-1.5 rounded-full bg-emerald-400/70" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Market Movers</p>
          </div>
          <div className="grid gap-2 p-3">
            <div>
              <SectionHeader title="Top Gainers" subtitle="Terminal tape" />
              <div className="mt-2 space-y-1.5">
                {topGainers.map((item) => (
                  <TapeRow key={item.id} item={item} />
                ))}
              </div>
            </div>
            <div className="pt-2">
              <SectionHeader title="Top Losers" subtitle="Pressure tape" />
              <div className="mt-2 space-y-1.5">
                {topLosers.map((item) => (
                  <TapeRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
