"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { MetricTile, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { SearchCommandBar } from "@/components/v2/workspace";
import { RuntimeObservabilityBadges } from "@/components/runtime/RuntimeObservabilityBadges";
import { fmtPercent, fmtLastUpdated } from "@/lib/formatters";
import { useMarketDomainGraph, useMarketIntelligenceEngine, scoreAssetConviction, type MarketAsset } from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";
import { MARKET_SECTOR_CHIPS, SECTOR_CHIP_KEYWORDS, type MarketSectorChip } from "@/domains/market/sectorFilters";

const MIN_SEARCH_LENGTH = MARKET_SEARCH_MIN_QUERY_LENGTH;

// ─── Breakout thresholds ──────────────────────────────────────────────────────
const BREAKOUT_CHANGE_THRESHOLD = 2.5;
const BREAKOUT_VOLUME_THRESHOLD = 500_000;

// ─── Heatmap ─────────────────────────────────────────────────────────────────

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
  const prevRef = useRef(item.changePercent);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    const prev = prevRef.current;
    const current = item.changePercent;
    if (current !== prev) {
      prevRef.current = current;
      const cls = current > prev ? "price-flash-up" : "price-flash-down";
      setFlashClass(cls);
      const t = setTimeout(() => setFlashClass(""), 950);
      return () => clearTimeout(t);
    }
  }, [item.changePercent]);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`rounded-xl border px-3 py-2.5 text-left transition-all hover:brightness-110 ${HEATMAP_CLASSES[tone]} ${flashClass}`}
    >
      <p className="text-xs font-bold">{item.symbol}</p>
      <p className="mt-0.5 text-[10px] opacity-70 truncate">{item.sector}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{fmtPercent(item.changePercent, true)}</p>
    </button>
  );
});

// ─── Breadth bar ──────────────────────────────────────────────────────────────

function BreadthBar({ advances, declines, unchanged }: { advances: number; declines: number; unchanged: number }) {
  const total = advances + declines + unchanged || 1;
  const advPct = (advances / total) * 100;
  const decPct = (declines / total) * 100;
  const unchPct = 100 - advPct - decPct;
  return (
    <div className="space-y-2">
      <div className="flex h-4 overflow-hidden rounded-full">
        <div className="bg-emerald-500/70 transition-all duration-700" style={{ width: `${advPct}%` }} />
        <div className="bg-slate-700/60 transition-all duration-700" style={{ width: `${unchPct}%` }} />
        <div className="bg-rose-500/70 transition-all duration-700" style={{ width: `${decPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-emerald-400 tabular-nums">{advances} adv</span>
        <span className="text-slate-500 tabular-nums">{unchanged} unch</span>
        <span className="text-rose-400 tabular-nums">{declines} dec</span>
      </div>
    </div>
  );
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({ points, up, width = 56, height = 20 }: { points: number[]; up: boolean; width?: number; height?: number }) {
  const data = points.length > 1 ? points : [0, 0];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const spread = Math.max(1, max - min);
  const path = data
    .map((p, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((p - min) / spread) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="shrink-0" style={{ width, height }} aria-hidden="true">
      <path d={path} fill="none" stroke={up ? "#34d399" : "#fb7185"} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function classifyCapTier(marketCap: number): string {
  if (marketCap >= 200_000_000_000) return "Large";
  if (marketCap >= 50_000_000_000) return "Mid";
  if (marketCap > 0) return "Small";
  return "";
}

function fmtVolume(volume: number): string {
  if (volume >= 10_000_000) return `${(volume / 10_000_000).toFixed(1)}Cr`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume > 0 ? String(volume) : "—";
}

function liquidityScore(volume: number): number {
  if (volume >= 5_000_000) return 95;
  if (volume >= 2_000_000) return 82;
  if (volume >= 1_000_000) return 70;
  if (volume >= 500_000) return 55;
  if (volume >= 100_000) return 40;
  return 25;
}

function fmtAbsChange(change: number): string {
  if (!change || change === 0) return "";
  const sign = change > 0 ? "+" : "";
  return `${sign}${Math.abs(change).toFixed(2)}`;
}

function formatAssetKind(kind: MarketAsset["kind"]): string {
  switch (kind) {
    case "stock": return "Stock";
    case "global-stock": return "Gbl Stock";
    case "etf": return "ETF";
    case "mutual-fund": return "Fund";
    case "commodity": return "Commodity";
    case "metal": return "Metal";
    case "forex": return "FX";
    case "index": return "Index";
    default: return "Asset";
  }
}

// ─── Enriched Mover Row (Phase 2) ─────────────────────────────────────────────

const RS_STRONG_THRESHOLD = 2;
const RS_WEAK_THRESHOLD = -2;

function relativeStrengthLabel(changePercent: number): string {
  if (changePercent >= RS_STRONG_THRESHOLD) return "Strong";
  if (changePercent >= 0) return "Positive";
  if (changePercent >= RS_WEAK_THRESHOLD) return "Weak";
  return "Negative";
}

const MoverRow = memo(function MoverRow({
  item,
  side,
  sectorRank,
  conviction,
  onSelect,
}: {
  item: MarketAsset;
  side: "gainer" | "loser";
  sectorRank: number;
  conviction: number;
  onSelect: (asset: MarketAsset) => void;
}) {
  const up = side === "gainer";
  const isBreakout = item.changePercent >= BREAKOUT_CHANGE_THRESHOLD && item.volume >= BREAKOUT_VOLUME_THRESHOLD;
  const capTier = classifyCapTier(item.marketCap);
  const liqScore = liquidityScore(item.volume);
  const trendUp =
    item.sparkline.length > 1 ? item.sparkline[item.sparkline.length - 1] >= item.sparkline[0] : up;

  const prevRef = useRef(item.changePercent);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    const prev = prevRef.current;
    const current = item.changePercent;
    if (current !== prev) {
      prevRef.current = current;
      const cls = current > prev ? "price-flash-up" : "price-flash-down";
      setFlashClass(cls);
      const t = setTimeout(() => setFlashClass(""), 950);
      return () => clearTimeout(t);
    }
  }, [item.changePercent]);

  const convictionColor =
    conviction >= 80
      ? "text-emerald-300"
      : conviction >= 65
      ? "text-sky-300"
      : conviction >= 50
      ? "text-amber-300"
      : "text-rose-300";

  const relStrength = relativeStrengthLabel(item.changePercent);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group w-full rounded-xl border px-3 py-2.5 text-left transition-all hover:brightness-105 ${flashClass} ${
        up
          ? "border-emerald-400/12 bg-emerald-500/[0.04] hover:border-emerald-400/25"
          : "border-rose-400/12 bg-rose-500/[0.04] hover:border-rose-400/25"
      }`}
    >
      {/* Top: ticker + badges + percent */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-bold text-white">{item.symbol}</p>
            {isBreakout && (
              <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-1.5 py-px text-[9px] font-semibold text-sky-300">
                BO
              </span>
            )}
            <span className="rounded border border-white/8 bg-white/[0.04] px-1.5 py-px text-[9px] text-slate-400">
              {formatAssetKind(item.kind)}
            </span>
            {capTier ? (
              <span className="rounded border border-white/6 bg-white/[0.03] px-1.5 py-px text-[9px] text-slate-500">
                {capTier}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">{item.name}</p>
          <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] text-slate-600">{item.sector}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-sm font-bold tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtPercent(item.changePercent, true)}
          </p>
          {item.change !== 0 ? (
            <p className="mt-0.5 text-[10px] tabular-nums text-slate-500">{fmtAbsChange(item.change)}</p>
          ) : null}
        </div>
      </div>

      {/* Bottom: volume / liquidity / conviction / rel-strength / sparkline */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <span className="text-[9px] text-slate-500 tabular-nums">Vol {fmtVolume(item.volume)}</span>
          <span className="text-[9px] text-slate-600 tabular-nums">Liq {liqScore}</span>
          <span className={`text-[9px] font-semibold tabular-nums ${convictionColor}`}>AI {conviction}</span>
          <span className="text-[9px] text-slate-600">{relStrength} RS</span>
          {sectorRank > 0 && (
            <span className="text-[9px] text-slate-600 tabular-nums">#{sectorRank}</span>
          )}
        </div>
        <MiniSparkline points={item.sparkline} up={trendUp} />
      </div>
    </button>
  );
});

// ─── Sector chip filters (Phase 3) ───────────────────────────────────────────

function applyChipFilter(assets: MarketAsset[], chip: MarketSectorChip): MarketAsset[] {
  if (chip === "All") return assets;
  if (chip === "India Growth") return assets.filter((a) => a.market === "India");
  if (chip === "Global Tech") {
    return assets.filter(
      (a) =>
        a.market === "Global" &&
        ["technology", "communication", "ai"].some((t) => a.sector.toLowerCase().includes(t))
    );
  }
  const targets = SECTOR_CHIP_KEYWORDS[chip];
  return assets.filter((a) =>
    targets.some(
      (t) => a.sector.toLowerCase().includes(t) || a.category.toLowerCase().includes(t)
    )
  );
}

// ─── Main surface ─────────────────────────────────────────────────────────────

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
    runtime,
    searchMarket,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();

  const [query, setQuery] = useState("");
  const [highlightedAsset, setHighlightedAsset] = useState<MarketAsset | null>(null);
  const [heatmapChip, setHeatmapChip] = useState<MarketSectorChip>("All");

  const intelligence = useMarketIntelligenceEngine(null, sectorMovers, watchlist);

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  const sectorRankMap = useMemo(
    () =>
      new Map(
        sectorMovers.map((mover, index) => [mover.sector.toLowerCase(), Math.max(1, index + 1)])
      ),
    [sectorMovers]
  );

  const baseAssets = useMemo(() => assets.filter((a) => a.market !== "Fund"), [assets]);
  const filteredHeatmapAssets = useMemo(
    () => applyChipFilter(baseAssets, heatmapChip),
    [baseAssets, heatmapChip]
  );

  const indiaAssets = useMemo(
    () => filteredHeatmapAssets.filter((a) => a.market === "India").slice(0, 20),
    [filteredHeatmapAssets]
  );
  const globalAssets = useMemo(
    () => filteredHeatmapAssets.filter((a) => a.market === "Global").slice(0, 16),
    [filteredHeatmapAssets]
  );
  const macroAssets = useMemo(
    () =>
      filteredHeatmapAssets
        .filter((a) => a.market === "Macro" || a.market === "Commodity")
        .slice(0, 12),
    [filteredHeatmapAssets]
  );

  const topSectors = sectorMovers.slice(0, 8);
  const updatedAt = fmtLastUpdated(lastUpdated);

  const pulseLabel =
    breadth.marketPulse >= 60 ? "Bullish" : breadth.marketPulse >= 40 ? "Neutral" : "Bearish";
  const pulseColor =
    breadth.marketPulse >= 60
      ? "text-emerald-400"
      : breadth.marketPulse >= 40
      ? "text-amber-300"
      : "text-rose-400";
  const pulseDotClass =
    breadth.marketPulse >= 60
      ? "bg-emerald-400"
      : breadth.marketPulse >= 40
      ? "bg-amber-400"
      : "bg-rose-500";

  return (
    <SurfaceCard className="p-0 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-500/20">
            <span className="text-[9px] font-bold text-violet-300">MK</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-violet-400/80">Markets Pulse</p>
              <span className={`inline-block h-1.5 w-1.5 rounded-full live-pulse ${pulseDotClass}`} />
              <span className={`text-[10px] font-semibold ${pulseColor}`}>{pulseLabel}</span>
            </div>
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
      <div className="border-b border-white/8 px-4 py-2.5">
        <RuntimeObservabilityBadges
          runtime={runtime}
          commodityUnavailable={search.commodityUnavailable}
        />
      </div>

      <div className="overflow-y-auto">
        {/* ── Row 1: Market overview pulse bar ── */}
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

        {/* ── Row 2: Sector rotation + breadth ── */}
        <div className="grid md:grid-cols-[2fr_1fr] gap-0 border-b border-white/8">
          {/* Sector rotation */}
          <div className="border-r border-white/8 p-4">
            <SectionHeader title="Sector Rotation" subtitle="Leadership drift and flow" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {topSectors.map((sector, i) => (
                <div
                  key={sector.sector}
                  className={`rounded-xl border px-3 py-2.5 transition-colors ${
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

          {/* Breadth */}
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
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2 w-2 rounded-full live-pulse ${pulseDotClass}`} />
                  <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Market Pulse</p>
                </div>
                <p className={`text-sm font-semibold ${pulseColor}`}>{pulseLabel}</p>
                <div className="mt-1.5 h-1 w-full rounded-full bg-white/8 overflow-hidden">
                  <div
                    className={`h-1 rounded-full transition-all duration-700 ${pulseDotClass}`}
                    style={{ width: `${Math.max(4, Math.min(100, breadth.marketPulse))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Chip filters + Heatmaps ── */}
        <div className="border-b border-white/8 p-4 space-y-4">
          {/* Chip filters */}
          <div className="flex flex-wrap gap-1.5">
            {MARKET_SECTOR_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setHeatmapChip(chip)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  heatmapChip === chip
                    ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {indiaAssets.length > 0 ? (
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
          ) : null}

          {globalAssets.length > 0 ? (
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
          ) : null}

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

          {indiaAssets.length === 0 && globalAssets.length === 0 && macroAssets.length === 0 ? (
            <p className="text-xs text-slate-500">No assets match the selected filter.</p>
          ) : null}
        </div>

        {/* ── Row 4: Market Leaders — enriched mover rows (Phase 2) ── */}
        <div className="grid md:grid-cols-2 gap-0 border-b border-white/8">
          <div className="border-r border-white/8 p-4">
            <SectionHeader
              title="Top Gainers"
              subtitle="Momentum leaders"
              action={
                topGainers.length > 0 ? (
                  <span className="text-[10px] text-emerald-400/70">{topGainers.length} symbols</span>
                ) : undefined
              }
            />
            <div className="mt-3 space-y-2">
              {topGainers.slice(0, 8).map((item) => {
                const rank = sectorRankMap.get(item.sector.toLowerCase()) ?? 6;
                const conviction = scoreAssetConviction(item.changePercent, rank, item.volume);
                return (
                  <MoverRow
                    key={item.id}
                    item={item}
                    side="gainer"
                    sectorRank={rank}
                    conviction={conviction}
                    onSelect={setHighlightedAsset}
                  />
                );
              })}
              {topGainers.length === 0 && (
                <p className="text-xs text-slate-500">Scanning for momentum leaders…</p>
              )}
            </div>
          </div>
          <div className="p-4">
            <SectionHeader
              title="Top Losers"
              subtitle="Pressure zones"
              action={
                topLosers.length > 0 ? (
                  <span className="text-[10px] text-rose-400/70">{topLosers.length} symbols</span>
                ) : undefined
              }
            />
            <div className="mt-3 space-y-2">
              {topLosers.slice(0, 8).map((item) => {
                const rank = sectorRankMap.get(item.sector.toLowerCase()) ?? 6;
                const conviction = scoreAssetConviction(item.changePercent, rank, item.volume);
                return (
                  <MoverRow
                    key={item.id}
                    item={item}
                    side="loser"
                    sectorRank={rank}
                    conviction={conviction}
                    onSelect={setHighlightedAsset}
                  />
                );
              })}
              {topLosers.length === 0 && (
                <p className="text-xs text-slate-500">No significant declines detected.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 5: Macro AI signals ── */}
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

        {/* ── Highlighted asset detail ── */}
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
                  className={`text-sm font-semibold tabular-nums ${
                    highlightedAsset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
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
