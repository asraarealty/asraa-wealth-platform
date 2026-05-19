"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { MetricTile, SectionHeader, SurfaceCard, StatusPill } from "@/components/v2/ui";
import { SearchCommandBar } from "@/components/v2/workspace";
import { fmtPercent } from "@/lib/formatters";
import { useMarketDomainGraph, useMarketIntelligenceEngine, type MarketAsset } from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";

const MIN_SEARCH_LENGTH = MARKET_SEARCH_MIN_QUERY_LENGTH;

type HeatmapTone = "strong-up" | "up" | "flat" | "down" | "strong-down";

function heatmapTone(changePercent: number): HeatmapTone {
  if (changePercent >= 2) return "strong-up";
  if (changePercent >= 0.5) return "up";
  if (changePercent > -0.5) return "flat";
  if (changePercent > -2) return "down";
  return "strong-down";
}

const HEATMAP_CLASSES: Record<HeatmapTone, string> = {
  "strong-up": "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  up: "border-emerald-400/15 bg-emerald-500/8 text-emerald-300",
  flat: "border-white/8 bg-white/[0.03] text-slate-300",
  down: "border-rose-400/15 bg-rose-500/8 text-rose-300",
  "strong-down": "border-rose-400/30 bg-rose-500/15 text-rose-200",
};

const HeatCell = memo(function HeatCell({
  item,
  onSelect,
}: {
  item: MarketAsset;
  onSelect: (asset: MarketAsset) => void;
}) {
  const tone = heatmapTone(item.changePercent);
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`rounded-xl border px-3 py-2.5 text-left transition-all hover:brightness-110 ${HEATMAP_CLASSES[tone]}`}
    >
      <p className="text-xs font-bold">{item.symbol}</p>
      <p className="mt-0.5 text-[10px] opacity-70 truncate">{item.sector}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{fmtPercent(item.changePercent, true)}</p>
    </button>
  );
});

function BreadthBar({ advances, declines, unchanged }: { advances: number; declines: number; unchanged: number }) {
  const total = advances + declines + unchanged || 1;
  const advPct = (advances / total) * 100;
  const decPct = (declines / total) * 100;
  const unchPct = 100 - advPct - decPct;
  return (
    <div className="space-y-2">
      <div className="flex h-4 overflow-hidden rounded-full">
        <div className="bg-emerald-500/70 transition-all" style={{ width: `${advPct}%` }} />
        <div className="bg-slate-700/60 transition-all" style={{ width: `${unchPct}%` }} />
        <div className="bg-rose-500/70 transition-all" style={{ width: `${decPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-emerald-400">{advances} adv</span>
        <span className="text-slate-500">{unchanged} unch</span>
        <span className="text-rose-400">{declines} dec</span>
      </div>
    </div>
  );
}

export function MarketsPulse() {
  const {
    assets,
    marketOverview,
    topGainers,
    topLosers,
    sectorMovers,
    watchlist,
    breadth,
    search,
    searchMarket,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();

  const [query, setQuery] = useState("");
  const [highlightedAsset, setHighlightedAsset] = useState<MarketAsset | null>(null);

  const intelligence = useMarketIntelligenceEngine(null, sectorMovers, watchlist);

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  const indiaAssets = useMemo(() => assets.filter((a) => a.market === "India").slice(0, 20), [assets]);
  const globalAssets = useMemo(() => assets.filter((a) => a.market === "Global").slice(0, 16), [assets]);
  const macroAssets = useMemo(() => assets.filter((a) => a.market === "Macro" || a.market === "Commodity").slice(0, 12), [assets]);

  const topSectors = sectorMovers.slice(0, 8);

  const updatedAt = lastUpdated ? new Date(lastUpdated).toISOString().slice(11, 16) + " UTC" : null;

  return (
    <SurfaceCard className="p-0 overflow-hidden">
      {/* Macro desk header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-500/20">
            <span className="text-[9px] font-bold text-violet-300">MK</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-violet-400/80">Markets Pulse</p>
            <p className="text-[11px] text-slate-500">
              Macro desk · global indices · sector rotation
              {updatedAt ? ` · ${updatedAt}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error ? <span className="text-[10px] text-rose-400">Feed error</span> : null}
          <div className="w-40">
            <SearchCommandBar value={query} onChange={setQuery} placeholder="Search markets…" label="Market search" />
          </div>
          <button type="button" className="v2-action text-[10px]" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        {/* Row 1: Market overview pulse bar */}
        <div className="border-b border-white/8 px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {isLoading && marketOverview.length === 0 ? (
              <p className="col-span-full text-xs text-slate-500">Loading market overview…</p>
            ) : (
              marketOverview.map((metric) => (
                <MetricTile
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  change={metric.delta}
                  positive={metric.tone === "success" ? true : metric.tone === "warn" ? false : undefined}
                />
              ))
            )}
          </div>
        </div>

        {/* Row 2: Sector rotation + breadth */}
        <div className="grid md:grid-cols-[2fr_1fr] gap-0 border-b border-white/8">
          {/* Sector rotation */}
          <div className="border-r border-white/8 p-4">
            <SectionHeader title="Sector Rotation" subtitle="Leadership drift and flow" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {topSectors.map((sector, i) => (
                <div
                  key={sector.sector}
                  className={`rounded-xl border px-3 py-2.5 ${
                    sector.avgChangePercent >= 0
                      ? "border-emerald-400/20 bg-emerald-500/[0.06]"
                      : "border-rose-400/20 bg-rose-500/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-medium text-white truncate">{sector.sector}</p>
                    <span className="text-[9px] text-slate-600">#{i + 1}</span>
                  </div>
                  <p
                    className={`mt-1 text-sm font-bold tabular-nums ${
                      sector.avgChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {fmtPercent(sector.avgChangePercent, true)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500 truncate">
                    {sector.leaders.slice(0, 2).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Market breadth */}
          <div className="p-4">
            <SectionHeader title="Market Breadth" subtitle="Advancers vs decliners" />
            <div className="mt-3 space-y-3">
              <BreadthBar
                advances={breadth.advances}
                declines={breadth.declines}
                unchanged={breadth.unchanged}
              />
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label="Advances" value={String(breadth.advances)} />
                <MetricTile label="Declines" value={String(breadth.declines)} />
                <MetricTile label="Unchanged" value={String(breadth.unchanged)} />
                <MetricTile label="Tracked" value={String(breadth.total)} />
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Market Pulse</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {breadth.marketPulse >= 60 ? "Bullish" : breadth.marketPulse >= 40 ? "Neutral" : "Bearish"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Heatmaps — India + Global + Macro */}
        <div className="border-b border-white/8 p-4 space-y-4">
          <div>
            <SectionHeader
              title="India Heatmap"
              subtitle={`${indiaAssets.length} liquid symbols`}
              action={
                <span className="text-[10px] text-slate-500">
                  {indiaAssets.filter((a) => a.changePercent >= 0).length} up /{" "}
                  {indiaAssets.filter((a) => a.changePercent < 0).length} down
                </span>
              }
            />
            <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 xl:grid-cols-10 gap-1.5">
              {indiaAssets.map((item) => (
                <HeatCell key={item.id} item={item} onSelect={setHighlightedAsset} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeader
              title="Global Heatmap"
              subtitle={`${globalAssets.length} global symbols`}
              action={
                <span className="text-[10px] text-slate-500">
                  {globalAssets.filter((a) => a.changePercent >= 0).length} up /{" "}
                  {globalAssets.filter((a) => a.changePercent < 0).length} down
                </span>
              }
            />
            <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-1.5">
              {globalAssets.map((item) => (
                <HeatCell key={item.id} item={item} onSelect={setHighlightedAsset} />
              ))}
            </div>
          </div>

          {macroAssets.length > 0 ? (
            <div>
              <SectionHeader title="Commodities & Macro" subtitle="Cross-asset risk signals" />
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                {macroAssets.map((item) => (
                  <HeatCell key={item.id} item={item} onSelect={setHighlightedAsset} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Row 4: Top movers — gainers + losers */}
        <div className="grid md:grid-cols-2 gap-0 border-b border-white/8">
          <div className="border-r border-white/8 p-4">
            <SectionHeader title="Top Gainers" subtitle="Momentum leaders" />
            <div className="mt-3 space-y-1.5">
              {topGainers.slice(0, 7).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/10 bg-emerald-500/[0.04] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{item.symbol}</p>
                    <p className="text-[10px] text-slate-500 truncate">{item.sector}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald-400">{fmtPercent(item.changePercent, true)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4">
            <SectionHeader title="Top Losers" subtitle="Pressure zones" />
            <div className="mt-3 space-y-1.5">
              {topLosers.slice(0, 7).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-rose-400/10 bg-rose-500/[0.04] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{item.symbol}</p>
                    <p className="text-[10px] text-slate-500 truncate">{item.sector}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-rose-400">{fmtPercent(item.changePercent, true)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 5: Macro AI signals */}
        <div className="p-4">
          <SectionHeader title="Macro Intelligence" subtitle="Institutional macro tape · AI-generated signals" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {intelligence.aiInsights.slice(0, 6).map((insight) => (
              <div
                key={insight.title}
                className="rounded-xl border border-violet-400/15 bg-violet-500/[0.05] px-3 py-3"
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-violet-400/70">{insight.title}</p>
                <p className="mt-1.5 text-xs text-slate-300 leading-5">{insight.message}</p>
              </div>
            ))}
          </div>

          {intelligence.riskAlerts.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-500/[0.05] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-amber-400/70 mb-2">Macro Risk Signals</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {intelligence.riskAlerts.slice(0, 4).map((alert) => (
                  <p key={alert} className="text-xs text-amber-100/80">
                    {alert}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Highlighted asset detail (if user clicks heatmap cell) */}
        {highlightedAsset ? (
          <div className="border-t border-white/8 px-4 py-3 flex items-center justify-between gap-4 bg-white/[0.02]">
            <div>
              <p className="text-sm font-bold text-white">{highlightedAsset.symbol}</p>
              <p className="text-[11px] text-slate-400">{highlightedAsset.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Change</p>
                <p
                  className={`text-sm font-semibold ${highlightedAsset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {fmtPercent(highlightedAsset.changePercent, true)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Market</p>
                <p className="text-xs text-white">{highlightedAsset.market}</p>
              </div>
              <button
                type="button"
                className="text-[10px] text-slate-500 hover:text-white"
                onClick={() => setHighlightedAsset(null)}
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
