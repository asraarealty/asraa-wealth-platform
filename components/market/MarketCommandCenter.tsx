"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { AllocationRing } from "@/components/admin/platform/AllocationRing";
import { IntelligenceCard, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { SearchCommandBar } from "@/components/v2/workspace";
import { RuntimeObservabilityBadges } from "@/components/runtime/RuntimeObservabilityBadges";
import { fmtPercent } from "@/lib/formatters";
import { useMarketDomainGraph as useMarketOrchestrator, type MarketAsset } from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";
import { scoreAssetConviction, useMarketIntelligenceEngine } from "@/domains/market";

export type WorkspaceSurface =
  | "market-overview"
  | "asset-detail"
  | "ai-analysis"
  | "sector-rotation"
  | "top-movers"
  | "portfolio-exposure"
  | "macro-intelligence"
  | "market-breadth";

interface MarketCommandCenterProps {
  mode: "client" | "admin";
  initialSurface?: WorkspaceSurface;
  compact?: boolean;
}

const SURFACES: Array<{ key: WorkspaceSurface; label: string }> = [
  { key: "market-overview", label: "Market Overview" },
  { key: "asset-detail", label: "Asset Workspace" },
  { key: "ai-analysis", label: "Market Intelligence" },
  { key: "sector-rotation", label: "Sector Rotation" },
  { key: "top-movers", label: "Top Movers" },
  { key: "portfolio-exposure", label: "Portfolio Exposure" },
  { key: "macro-intelligence", label: "Macro View" },
  { key: "market-breadth", label: "Market Breadth" },
];

const QUICK_FILTERS = ["All", "India", "Global", "Fund", "Commodity", "Macro"] as const;
const MIN_SEARCH_LENGTH = MARKET_SEARCH_MIN_QUERY_LENGTH;
const PORTFOLIO_EXPOSURE_SIGNALS = ["concentrationRisk", "portfolioFit", "liquidityProfile"] as const;
const MAX_COMMAND_SEARCH_ITEMS = 6;

type QuickFilter = (typeof QUICK_FILTERS)[number];

function formatPrice(item: MarketAsset) {
  return new Intl.NumberFormat(item.currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: item.currency,
    maximumFractionDigits: 2,
  }).format(item.price || 0);
}

function formatUpdatedTime(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return `${new Date(timestamp).toISOString().slice(11, 16)} UTC`;
}

const QuoteRow = memo(function QuoteRow({
  item,
  onSelect,
  onToggleWatch,
  selected,
}: {
  item: MarketAsset;
  onSelect: (asset: MarketAsset) => void;
  onToggleWatch: (symbol: string) => void;
  selected: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 transition-colors ${
        selected ? "border-blue-400/30 bg-blue-500/10" : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="min-w-0 text-left" onClick={() => onSelect(item)}>
          <p className="truncate text-sm font-medium text-white">{item.symbol}</p>
          <p className="truncate text-[11px] text-slate-500">{item.name}</p>
        </button>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-white">{item.price > 0 ? formatPrice(item) : "—"}</p>
          <p className={item.changePercent >= 0 ? "text-[11px] text-emerald-400" : "text-[11px] text-rose-400"}>
            {fmtPercent(item.changePercent, true)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" className="v2-action" onClick={() => onToggleWatch(item.symbol)}>
          Watch
        </button>
      </div>
    </div>
  );
});

function useFilteredAssets(assets: MarketAsset[], quickFilter: QuickFilter) {
  return useMemo(() => {
    if (quickFilter === "All") return assets;
    return assets.filter((item) => item.market === quickFilter);
  }, [assets, quickFilter]);
}

function getAssetUniverseCounts(assets: MarketAsset[]) {
  return [
    { label: "India", value: assets.filter((item) => item.market === "India").length, color: "#38bdf8" },
    { label: "Global", value: assets.filter((item) => item.market === "Global").length, color: "#818cf8" },
    { label: "Funds", value: assets.filter((item) => item.kind === "mutual-fund").length, color: "#22c55e" },
    { label: "Commodity", value: assets.filter((item) => item.market === "Commodity").length, color: "#f59e0b" },
  ];
}

function findSectorRank(sector: string, sectorMovers: Array<{ sector: string }>) {
  const index = sectorMovers.findIndex((item) => item.sector.toLowerCase() === sector.toLowerCase());
  return index < 0 ? sectorMovers.length + 1 : index + 1;
}

export function MarketCommandCenter({ mode, initialSurface = "market-overview", compact = false }: MarketCommandCenterProps) {
  const {
    assets,
    marketOverview,
    topGainers,
    topLosers,
    trendingAssets,
    watchlist,
    sectorMovers,
    breadth,
    search,
    runtime,
    searchMarket,
    toggleWatchlist,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketOrchestrator();

  const [surface, setSurface] = useState<WorkspaceSurface>(initialSurface);
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("All");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  const intelligence = useMarketIntelligenceEngine(selectedAsset, sectorMovers, watchlist);
  const filteredAssets = useFilteredAssets(assets, quickFilter);

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  useEffect(() => {
    const selectedStillPresent =
      selectedAsset ? filteredAssets.some((item) => item.id === selectedAsset.id) : false;
    if (filteredAssets.length > 0 && (!selectedAsset || !selectedStillPresent)) {
      setSelectedAsset(filteredAssets[0]);
    }
  }, [filteredAssets, selectedAsset]);

  const updatedLabel = formatUpdatedTime(lastUpdated);

  const recentAssets = useMemo(
    () =>
      recentSymbols
        .map((symbol) => assets.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()))
        .filter(Boolean) as MarketAsset[],
    [assets, recentSymbols]
  );

  const topPicks = useMemo(() => {
    return trendingAssets.slice(0, 4).map((asset) => {
      const conviction = scoreAssetConviction(
        asset.changePercent,
        findSectorRank(asset.sector, sectorMovers),
        asset.volume
      );
      return { asset, conviction };
    });
  }, [sectorMovers, trendingAssets]);
  const commandSearchItems = useMemo(
    () =>
      [...(search.groups.clients ?? []), ...(search.groups.portfolios ?? []), ...(search.groups.sectors ?? []), ...(search.groups.themes ?? [])].slice(
        0,
        MAX_COMMAND_SEARCH_ITEMS
      ),
    [search.groups.clients, search.groups.portfolios, search.groups.sectors, search.groups.themes]
  );

  const onSelectAsset = (asset: MarketAsset) => {
    setSelectedAsset(asset);
    setSurface("asset-detail");
    setRecentSymbols((prev) => [asset.symbol, ...prev.filter((item) => item !== asset.symbol)].slice(0, 7));
  };

  const compactClass = compact ? "max-h-[28rem] overflow-y-auto" : "";

  return (
    <SurfaceCard className={`p-4 sm:p-5 ${compactClass}`}>
      <SectionHeader
        eyebrow={mode === "admin" ? "Unified Admin + Client Market OS" : "Unified Wealth Market OS"}
        title="Market Command Center"
        subtitle={`One canonical search, quote, intelligence, and workspace engine${updatedLabel ? ` · Updated ${updatedLabel}` : ""}`}
        action={
          <button type="button" className="v2-action" onClick={() => void refresh()}>
            Refresh
          </button>
        }
      />

      <div className="mt-3">
        <RuntimeObservabilityBadges
          runtime={runtime}
          commodityUnavailable={search.commodityUnavailable}
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="mt-4 hidden md:grid gap-4 md:grid-cols-[1fr_2fr] xl:grid-cols-[1fr_2fr_1fr]">
        <div className="space-y-4 md:col-span-2 xl:col-span-1">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <SearchCommandBar
              value={query}
              onChange={setQuery}
              placeholder="Search stocks, ETFs, funds, commodities, clients, portfolios, sectors, themes..."
              label="Market command search"
            />
            {query.trim().length >= MIN_SEARCH_LENGTH ? (
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                {[...(search.groups.stocks ?? []), ...(search.groups.etfs ?? []), ...(search.groups.mutualFunds ?? []), ...(search.groups.commodities ?? [])]
                  .slice(0, 10)
                  .map((item) => (
                    <QuoteRow
                      key={item.id}
                      item={item}
                      onSelect={onSelectAsset}
                      onToggleWatch={toggleWatchlist}
                      selected={selectedAsset?.id === item.id}
                    />
                  ))}
                {search.isSearching ? <p className="text-xs text-slate-500">Searching...</p> : null}
                {commandSearchItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <p className="text-xs text-white">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.subtitle ?? item.kind}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Watchlists</p>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {watchlist.length === 0 ? (
                <p className="text-xs text-slate-500">No watchlist assets.</p>
              ) : (
                watchlist.slice(0, 8).map((item) => (
                  <QuoteRow
                    key={item.id}
                    item={item}
                    onSelect={onSelectAsset}
                    onToggleWatch={toggleWatchlist}
                    selected={selectedAsset?.id === item.id}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Recent Assets</p>
            <div className="mt-2 space-y-2">
              {recentAssets.length === 0 ? (
                <p className="text-xs text-slate-500">Asset history will appear as you drill into workspace mode.</p>
              ) : (
                recentAssets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectAsset(item)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.05]"
                  >
                    {item.symbol} · {item.category}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Quick Actions</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {["Compare", "Screeners", "Alerts", "Portfolio Impact"].map((action) => (
                <button key={action} type="button" className="v2-action text-[11px]">
                  {action}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Quick Filters</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-[10px] ${
                    quickFilter === filter
                      ? "border-blue-400/30 bg-blue-500/15 text-blue-200"
                      : "border-white/10 bg-white/[0.02] text-slate-400"
                  }`}
                  onClick={() => setQuickFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex flex-wrap gap-1.5">
              {SURFACES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSurface(item.key)}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    surface === item.key
                      ? "border-blue-400/30 bg-blue-500/15 text-blue-200"
                      : "border-white/10 bg-white/[0.02] text-slate-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {surface === "market-overview" ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <SectionHeader title="Market Overview" subtitle="Core cross-asset pulse" />
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(marketOverview.length > 0 ? marketOverview : []).map((metric) => (
                  <MetricTile
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    change={metric.delta}
                    positive={metric.tone === "success" ? true : metric.tone === "warn" ? false : undefined}
                  />
                ))}
                {isLoading ? <p className="text-xs text-slate-500">Loading market overview...</p> : null}
              </div>
            </div>
          ) : null}

          {surface === "top-movers" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <SectionHeader title="Top Gainers" subtitle="Momentum leaders" />
                <div className="mt-3 space-y-2">
                  {topGainers.slice(0, 7).map((item) => (
                    <QuoteRow
                      key={item.id}
                      item={item}
                      onSelect={onSelectAsset}
                      onToggleWatch={toggleWatchlist}
                      selected={selectedAsset?.id === item.id}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <SectionHeader title="Top Losers" subtitle="Pressure zones" />
                <div className="mt-3 space-y-2">
                  {topLosers.slice(0, 7).map((item) => (
                    <QuoteRow
                      key={item.id}
                      item={item}
                      onSelect={onSelectAsset}
                      onToggleWatch={toggleWatchlist}
                      selected={selectedAsset?.id === item.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {surface === "sector-rotation" ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <SectionHeader title="Sector Rotation" subtitle="Leadership and drift" />
              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                {sectorMovers.map((sector) => (
                  <div key={sector.sector} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{sector.sector}</p>
                      <p className={sector.avgChangePercent >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>
                        {fmtPercent(sector.avgChangePercent, true)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Leaders: {sector.leaders.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {surface === "portfolio-exposure" ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <SectionHeader title="Portfolio Exposure" subtitle="Universe concentration and cross-asset balance" />
              <div className="mt-3">
                <AllocationRing segments={getAssetUniverseCounts(filteredAssets)} size={140} />
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {intelligence.proprietarySignals
                  .filter((item) =>
                    PORTFOLIO_EXPOSURE_SIGNALS.includes(
                      item.key as (typeof PORTFOLIO_EXPOSURE_SIGNALS)[number]
                    )
                  )
                  .map((signal) => (
                    <div key={signal.key} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{signal.label}</p>
                      <p className="mt-1 text-sm text-white">{signal.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {surface === "macro-intelligence" ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <SectionHeader title="Macro View" subtitle="Institutional macro tape" />
              <p className="mt-3 text-sm leading-7 text-slate-300">{intelligence.macroSummary}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(intelligence.trendAnalysis.length > 0 ? intelligence.trendAnalysis : intelligence.opportunities)
                  .slice(0, 6)
                  .map((line) => (
                    <div key={line} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                      {line}
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {surface === "market-breadth" ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <SectionHeader title="Market Breadth" subtitle="Advancers, decliners, and unchanged universe" />
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <MetricTile label="Advances" value={String(breadth.advances)} />
                <MetricTile label="Declines" value={String(breadth.declines)} />
                <MetricTile label="Unchanged" value={String(breadth.unchanged)} />
              </div>
              <p className="mt-3 text-xs text-slate-500">Tracked liquid symbols: {breadth.total}</p>
            </div>
          ) : null}

          {surface === "ai-analysis" ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <SectionHeader title="Market Intelligence" subtitle="Signals, opportunities, and conviction overlays" />
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {intelligence.aiInsights.slice(0, 4).map((insight) => (
                  <IntelligenceCard
                    key={insight.title}
                    title={insight.title}
                    message={insight.message}
                    confidence={typeof insight.confidence === "number" && insight.confidence > 0 ? insight.confidence : undefined}
                    tone="info"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {surface === "asset-detail" ? (
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/[0.04] p-3">
              <SectionHeader
                title={selectedAsset ? `${selectedAsset.symbol} Workspace` : "Asset Workspace"}
                subtitle="Dynamic in-place asset mode: chart, AI, fundamentals, exposure, technicals, news, sectors, portfolio impact, risk"
              />
              {selectedAsset ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <MetricTile
                    label="Live Price"
                    value={selectedAsset.price > 0 ? formatPrice(selectedAsset) : "—"}
                    change={fmtPercent(selectedAsset.changePercent, true)}
                    positive={selectedAsset.changePercent >= 0}
                  />
                  <MetricTile label="Market / Type" value={`${selectedAsset.market} · ${selectedAsset.category}`} sub={selectedAsset.sector} />
                  {intelligence.proprietarySignals.slice(0, 6).map((signal) => (
                    <div key={signal.key} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{signal.label}</p>
                        <StatusPill label={signal.tone.toUpperCase()} tone={signal.tone} />
                      </div>
                      <p className="mt-1 text-sm text-white">{signal.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">Select any asset from the left rail to open workspace mode.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400/70">Market Intelligence</p>
            <div className="mt-2 space-y-2">
              {intelligence.proprietarySignals.slice(0, 4).map((signal) => (
                <div key={signal.key} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">{signal.label}</p>
                    <StatusPill label={signal.tone.toUpperCase()} tone={signal.tone} />
                  </div>
                  <p className="mt-1 text-sm text-white">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Alerts</p>
            <div className="mt-2 space-y-2 max-h-44 overflow-y-auto">
              {(intelligence.riskAlerts.length > 0 ? intelligence.riskAlerts : ["No active risk alerts."])
                .slice(0, 6)
                .map((item) => (
                  <div key={item} className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {item}
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Conviction Engine</p>
            <div className="mt-2 space-y-2">
              {topPicks.map(({ asset, conviction }) => (
                <div key={asset.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white">{asset.symbol}</p>
                    <span className="text-xs text-emerald-300">{conviction}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{asset.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Portfolio Impact</p>
            <div className="mt-2 space-y-2">
              {(selectedAsset
                ? [
                    `${selectedAsset.symbol}: ${selectedAsset.changePercent >= 0 ? "positive" : "negative"} momentum is influencing ${selectedAsset.market} sleeve risk.`,
                    `Sector ${selectedAsset.sector} rank is #${Math.max(1, sectorMovers.findIndex((s) => s.sector === selectedAsset.sector) + 1)} in current rotation.`,
                  ]
                : ["Select an asset to evaluate portfolio impact."]
              ).map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Portfolio Intelligence</p>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {(intelligence.portfolioIntelligence.length > 0 ? intelligence.portfolioIntelligence : intelligence.opportunities)
                .slice(0, 4)
                .map((item) => (
                  <div key={item} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                    {item}
                  </div>
                ))}
            </div>
            {intelligence.errorMessage ? <p className="mt-2 text-xs text-rose-300">{intelligence.errorMessage}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 lg:hidden space-y-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400/70">Search Command Center</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search assets..."
            className="v2-input mt-2 w-full"
            aria-label="Mobile market command search"
          />
        </div>

        <div className="overflow-x-auto snap-x snap-mandatory">
          <div className="flex gap-3 min-w-max">
            {["market-overview", "top-movers", "ai-analysis", "asset-detail"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSurface(key as WorkspaceSurface)}
                className={`snap-start rounded-lg border px-3 py-2 text-xs ${
                  surface === key
                    ? "border-blue-400/30 bg-blue-500/15 text-blue-200"
                    : "border-white/10 bg-white/[0.02] text-slate-400"
                }`}
              >
                {SURFACES.find((item) => item.key === key)?.label ?? key}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(surface === "top-movers" ? topGainers : filteredAssets).slice(0, 6).map((item) => (
            <QuoteRow
              key={item.id}
              item={item}
              onSelect={onSelectAsset}
              onToggleWatch={toggleWatchlist}
              selected={selectedAsset?.id === item.id}
            />
          ))}
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Market Intelligence Cards</p>
          <div className="mt-2 space-y-2">
            {intelligence.proprietarySignals.slice(0, 3).map((signal) => (
              <IntelligenceCard key={signal.key} title={signal.label} message={signal.value} tone={signal.tone} />
            ))}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
