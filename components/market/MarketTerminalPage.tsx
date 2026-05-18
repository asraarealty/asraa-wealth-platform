"use client";

import { GlobalMarketSearch } from "@/components/market/GlobalMarketSearch";
import { AllocationRing } from "@/components/admin/platform/AllocationRing";
import { IntelligenceCard, LoadingBlock, MetricTile, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { useMarketOrchestrator, type MarketAsset } from "@/lib/services/marketOrchestrator";
import { fmtPercent } from "@/lib/formatters";

type Variant = "stocks" | "markets" | "watchlist" | "discover";

const CONFIG: Record<Variant, { eyebrow: string; title: string; subtitle: string; focus: string }> = {
  stocks: {
    eyebrow: "Live market terminal",
    title: "Cross-asset execution terminal",
    subtitle: "Indian and global equities, ETFs, mutual funds, commodities, and precious metals in one command surface.",
    focus: "Full universe",
  },
  markets: {
    eyebrow: "Market overview",
    title: "Global market command center",
    subtitle: "Macro pulse, sector rotation, and liquid market breadth for wealth operators.",
    focus: "Macro + breadth",
  },
  watchlist: {
    eyebrow: "Watchlist operating book",
    title: "Priority watchlist",
    subtitle: "Monitor conviction names, tactical entries, and precious-metal hedges in real time.",
    focus: "Watchlist only",
  },
  discover: {
    eyebrow: "Discovery engine",
    title: "AI-style market discovery",
    subtitle: "Surface trending movers, sector shifts, and asset opportunities across the platform universe.",
    focus: "Opportunities",
  },
};

function formatUpdatedTime(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return `${new Date(timestamp).toISOString().slice(11, 16)} UTC`;
}

function formatPrice(item: MarketAsset) {
  return new Intl.NumberFormat(item.currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: item.currency,
    maximumFractionDigits: 2,
  }).format(item.price || 0);
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const points = values.length > 1
    ? values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - ((value - Math.min(...values)) / Math.max(Math.max(...values) - Math.min(...values), 1)) * 100}`).join(" ")
    : "0,50 100,50";
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full overflow-visible">
      <polyline
        fill="none"
        stroke={positive ? "#34d399" : "#fb7185"}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function QuoteCard({ item, onToggle }: { item: MarketAsset; onToggle: (symbol: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.market} · {item.category}</p>
          <h3 className="mt-1 text-sm font-semibold text-white">{item.name}</h3>
          <p className="text-xs text-slate-500">{item.symbol} · {item.sector}</p>
        </div>
        <button type="button" className="v2-action" onClick={() => onToggle(item.symbol)}>
          Watch
        </button>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-white">{item.price > 0 ? formatPrice(item) : "—"}</p>
          <p className={item.changePercent >= 0 ? "mt-1 text-xs text-emerald-400" : "mt-1 text-xs text-rose-400"}>
            {fmtPercent(item.changePercent, true)} · {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}
          </p>
        </div>
        <div className="w-24">
          <Sparkline values={item.sparkline} positive={item.changePercent >= 0} />
        </div>
      </div>
    </div>
  );
}

function MarketList({ title, items, onToggle }: { title: string; items: MarketAsset[]; onToggle: (symbol: string) => void }) {
  return (
    <SurfaceCard className="p-4 sm:p-5">
      <SectionHeader eyebrow={title} title={title} subtitle="Live quote cards with mini trend signatures" />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <QuoteCard key={item.id} item={item} onToggle={onToggle} />
        ))}
      </div>
    </SurfaceCard>
  );
}

export function MarketTerminalPage({ variant }: { variant: Variant }) {
  const config = CONFIG[variant];
  const { assets, marketOverview, topGainers, topLosers, trendingAssets, watchlist, sectorMovers, isLoading, error, refresh, toggleWatchlist, lastUpdated } = useMarketOrchestrator();
  const updatedLabel = formatUpdatedTime(lastUpdated);

  if (isLoading && assets.length === 0) {
    return <LoadingBlock label="Loading live market terminal..." />;
  }

  const visibleAssets = (() => {
    if (variant === "watchlist") return watchlist;
    if (variant === "discover") return trendingAssets;
    if (variant === "markets") return assets.filter((item) => item.market === "Macro" || item.market === "Global" || item.market === "Commodity");
    return assets;
  })();

  const allocationSegments = [
    { label: "Indian", value: assets.filter((item) => item.market === "India").length, color: "#38bdf8" },
    { label: "Global", value: assets.filter((item) => item.market === "Global").length, color: "#818cf8" },
    { label: "Funds", value: assets.filter((item) => item.kind === "mutual-fund").length, color: "#22c55e" },
    { label: "Commodities", value: assets.filter((item) => item.market === "Commodity").length, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeader
            eyebrow={config.eyebrow}
            title={config.title}
            subtitle={`${config.subtitle}${updatedLabel ? ` · Updated ${updatedLabel}` : ""}`}
          />
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-blue-200">
              {config.focus}
            </span>
            <button type="button" className="v2-action" onClick={() => void refresh()}>
              Refresh terminal
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {marketOverview.map((metric) => (
            <MetricTile key={metric.label} label={metric.label} value={metric.value} change={metric.delta} positive={metric.tone === "success" ? true : metric.tone === "warn" ? false : undefined} />
          ))}
        </div>
      </SurfaceCard>

      <GlobalMarketSearch />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Market breadth" title="Realtime quote matrix" subtitle="Indian stocks, global leaders, funds, ETFs, and commodities" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleAssets.slice(0, 8).map((item) => (
              <QuoteCard key={item.id} item={item} onToggle={toggleWatchlist} />
            ))}
          </div>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard className="p-4 sm:p-5">
            <SectionHeader eyebrow="Sector movers" title="Rotation heatmap" subtitle="Fastest moving sectors across the liquid universe" />
            <div className="mt-4 space-y-3">
              {sectorMovers.map((sector) => (
                <div key={sector.sector} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{sector.sector}</p>
                    <p className={sector.avgChangePercent >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>
                      {fmtPercent(sector.avgChangePercent, true)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Leaders: {sector.leaders.join(" · ")}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-4 sm:p-5">
            <SectionHeader eyebrow="Universe mix" title="Coverage distribution" subtitle="How the terminal is balanced" />
            <div className="mt-4">
              <AllocationRing segments={allocationSegments} size={120} />
            </div>
          </SurfaceCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Top gainers" title="Momentum leaders" subtitle="Strongest positive movers" />
          <div className="mt-4 space-y-3">
            {topGainers.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.symbol}</p>
                  <p className="text-xs text-slate-500">{item.name}</p>
                </div>
                <p className="text-xs text-emerald-400">{fmtPercent(item.changePercent, true)}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Top losers" title="Pressure zones" subtitle="Weakest performers across the live feed" />
          <div className="mt-4 space-y-3">
            {topLosers.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.symbol}</p>
                  <p className="text-xs text-slate-500">{item.name}</p>
                </div>
                <p className="text-xs text-rose-400">{fmtPercent(item.changePercent, true)}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Watchlist" title="Priority assets" subtitle="Your operator shortlist" />
          <div className="mt-4 space-y-3">
            {(watchlist.length > 0 ? watchlist : trendingAssets.slice(0, 5)).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.symbol}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </div>
                <button type="button" className="v2-action" onClick={() => toggleWatchlist(item.symbol)}>
                  {watchlist.some((watch) => watch.symbol === item.symbol) ? "Remove" : "Add"}
                </button>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <MarketList title="Trending assets" items={trendingAssets.slice(0, 6)} onToggle={toggleWatchlist} />

      <div className="grid gap-4 xl:grid-cols-3">
        <IntelligenceCard title="Liquidity rotation" message="Top movers and sector breadth are refreshed from the centralized ticker engine for faster tactical reads." tone="info" confidence={0.82} />
        <IntelligenceCard title="ETF and fund convergence" message="Use the ETF and mutual-fund shelf to compare passive beta with managed alpha before allocation moves." tone="success" confidence={0.76} />
        <IntelligenceCard title="Commodity hedge visibility" message="Gold and silver sit alongside crude and FX to keep inflation hedges visible inside the wealth operating system." tone="warn" confidence={0.74} />
      </div>
    </div>
  );
}
