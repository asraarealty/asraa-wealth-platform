"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { IntelligenceCard, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { SearchCommandBar } from "@/components/v2/workspace";
import { fmtPercent, fmtLastUpdated } from "@/lib/formatters";
import { useMarketDomainGraph, scoreAssetConviction, useMarketIntelligenceEngine, type MarketAsset } from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";

const MIN_SEARCH_LENGTH = MARKET_SEARCH_MIN_QUERY_LENGTH;
const ANALYSIS_TABS = ["Signals", "Technicals", "Fundamentals", "Peers", "Institutional"] as const;
type AnalysisTab = (typeof ANALYSIS_TABS)[number];

function formatPrice(item: MarketAsset) {
  return new Intl.NumberFormat(item.currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: item.currency,
    maximumFractionDigits: 2,
  }).format(item.price || 0);
}

function formatVolume(volume: number) {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return String(volume);
}

const AssetRow = memo(function AssetRow({
  item,
  selected,
  onSelect,
}: {
  item: MarketAsset;
  selected: boolean;
  onSelect: (asset: MarketAsset) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
        selected
          ? "border-sky-400/30 bg-sky-500/10"
          : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{item.symbol}</p>
          <p className="truncate text-[10px] text-slate-500">{item.sector}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-[11px] font-medium ${item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtPercent(item.changePercent, true)}
          </p>
        </div>
      </div>
    </button>
  );
});

function ConvictionBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-400" : score >= 65 ? "bg-sky-400" : score >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/10">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right text-[11px] font-semibold text-white">{score}</span>
    </div>
  );
}

export function StocksTerminal() {
  const {
    assets,
    topGainers,
    topLosers,
    trendingAssets,
    watchlist,
    sectorMovers,
    search,
    searchMarket,
    toggleWatchlist,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();

  const [query, setQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("Signals");
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  const intelligence = useMarketIntelligenceEngine(selectedAsset, sectorMovers, watchlist);

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  useEffect(() => {
    if (!selectedAsset && assets.length > 0) setSelectedAsset(assets[0]);
  }, [assets, selectedAsset]);

  const onSelect = (asset: MarketAsset) => {
    setSelectedAsset(asset);
    setRecentSymbols((prev) => [asset.symbol, ...prev.filter((s) => s !== asset.symbol)].slice(0, 10));
  };

  const searchResults = useMemo(
    () =>
      query.trim().length >= MIN_SEARCH_LENGTH
        ? [
            ...(search.groups.stocks ?? []),
            ...(search.groups.etfs ?? []),
            ...(search.groups.mutualFunds ?? []),
            ...(search.groups.commodities ?? []),
          ].slice(0, 8)
        : [],
    [query, search.groups]
  );

  const recentAssets = useMemo(
    () =>
      recentSymbols
        .map((sym) => assets.find((a) => a.symbol.toUpperCase() === sym.toUpperCase()))
        .filter(Boolean) as MarketAsset[],
    [assets, recentSymbols]
  );

  const sidebarAssets = searchResults.length > 0 ? searchResults : recentAssets.length > 0 ? recentAssets : assets.slice(0, 12);

  const conviction = selectedAsset
    ? scoreAssetConviction(
        selectedAsset.changePercent,
        Math.max(1, sectorMovers.findIndex((s) => s.sector === selectedAsset.sector) + 1),
        selectedAsset.volume
      )
    : 0;

  const updatedAt = fmtLastUpdated(lastUpdated);

  return (
    <SurfaceCard className="p-0 overflow-hidden">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-500/20">
            <span className="text-[9px] font-bold text-sky-300">EQ</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-sky-400/80">Stocks Terminal</p>
            <p className="truncate text-[11px] text-slate-500">
              Deep single-asset analysis
              {updatedAt ? ` · ${updatedAt}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {error ? <span className="text-[10px] text-rose-400">Feed error</span> : null}
          <button type="button" className="v2-action text-[10px]" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[200px_1fr_220px] xl:grid-cols-[220px_1fr_240px] min-h-[600px]">
        {/* ── Left: Asset picker rail ── */}
        <div className="border-r border-white/8 flex flex-col gap-0">
          <div className="p-3 border-b border-white/8">
            <SearchCommandBar
              value={query}
              onChange={setQuery}
              placeholder="Symbol, name..."
              label="Stock search"
            />
            {search.isSearching ? (
              <p className="mt-1 text-[10px] text-slate-500">Searching...</p>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {searchResults.length === 0 && recentAssets.length > 0 ? (
              <p className="px-1 py-1 text-[9px] uppercase tracking-[0.14em] text-slate-600">Recent</p>
            ) : searchResults.length > 0 ? (
              <p className="px-1 py-1 text-[9px] uppercase tracking-[0.14em] text-slate-600">Results</p>
            ) : (
              <p className="px-1 py-1 text-[9px] uppercase tracking-[0.14em] text-slate-600">Universe</p>
            )}
            {sidebarAssets.map((item) => (
              <AssetRow
                key={item.id}
                item={item}
                selected={selectedAsset?.id === item.id}
                onSelect={onSelect}
              />
            ))}
            {isLoading && sidebarAssets.length === 0 ? (
              <p className="px-1 text-[10px] text-slate-500">Loading assets…</p>
            ) : null}
          </div>

          {/* Watchlist strip */}
          {watchlist.length > 0 ? (
            <div className="border-t border-white/8 p-2">
              <p className="px-1 mb-1 text-[9px] uppercase tracking-[0.14em] text-slate-600">Watchlist</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {watchlist.slice(0, 6).map((item) => (
                  <AssetRow key={item.id} item={item} selected={selectedAsset?.id === item.id} onSelect={onSelect} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Center: Asset workspace ── */}
        <div className="flex flex-col overflow-hidden">
          {selectedAsset ? (
            <>
              {/* Asset header — dominant price display */}
              <div className="border-b border-white/8 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-white">{selectedAsset.symbol}</h1>
                      <span className="rounded border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">
                        {selectedAsset.market}
                      </span>
                      <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400">
                        {selectedAsset.kind.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">{selectedAsset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {selectedAsset.price > 0 ? formatPrice(selectedAsset) : "—"}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        selectedAsset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {fmtPercent(selectedAsset.changePercent, true)}
                    </p>
                  </div>
                </div>

                {/* Core metrics bar */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <MetricTile label="Volume" value={formatVolume(selectedAsset.volume)} />
                  <MetricTile label="Sector" value={selectedAsset.sector || "—"} />
                  <MetricTile label="Category" value={selectedAsset.category || "—"} />
                  <MetricTile label="Currency" value={selectedAsset.currency} />
                </div>
              </div>

              {/* Analysis tab bar */}
              <div className="border-b border-white/8 px-4">
                <div className="flex gap-0 overflow-x-auto">
                  {ANALYSIS_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`border-b-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors whitespace-nowrap ${
                        activeTab === tab
                          ? "border-sky-400 text-sky-300"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "Signals" ? (
                  <div className="space-y-3">
                    <SectionHeader title="Proprietary Signals" subtitle="AI-generated conviction + risk overlay" />
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {intelligence.proprietarySignals.map((signal) => (
                        <div
                          key={signal.key}
                          className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{signal.label}</p>
                            <StatusPill label={signal.tone.toUpperCase()} tone={signal.tone} />
                          </div>
                          <p className="mt-1 text-sm font-medium text-white">{signal.value}</p>
                        </div>
                      ))}
                    </div>

                    {intelligence.aiInsights.length > 0 ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {intelligence.aiInsights.slice(0, 4).map((insight) => (
                          <IntelligenceCard
                            key={insight.title}
                            title={insight.title}
                            message={insight.message}
                            confidence={insight.confidence}
                            tone="info"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeTab === "Technicals" ? (
                  <div className="space-y-3">
                    <SectionHeader title="Technical Overlay" subtitle="Momentum, trend, and accumulation signals" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {intelligence.proprietarySignals
                        .filter((s) =>
                          ["momentumStrength", "accumulationDistribution", "valuationPressure"].includes(s.key)
                        )
                        .map((signal) => (
                          <div key={signal.key} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{signal.label}</p>
                            <p className="mt-2 text-base font-semibold text-white">{signal.value}</p>
                            <StatusPill label={signal.tone.toUpperCase()} tone={signal.tone} />
                          </div>
                        ))}
                    </div>
                    <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Trend Analysis</p>
                      <div className="mt-2 space-y-1.5">
                        {(intelligence.trendAnalysis.length > 0
                          ? intelligence.trendAnalysis
                          : intelligence.opportunities
                        )
                          .slice(0, 4)
                          .map((line) => (
                            <p key={line} className="text-xs text-slate-300">
                              {line}
                            </p>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "Fundamentals" ? (
                  <div className="space-y-3">
                    <SectionHeader title="Fundamental Analysis" subtitle="Valuation, liquidity, and macro exposure" />
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {intelligence.proprietarySignals
                        .filter((s) =>
                          ["liquidityProfile", "concentrationRisk", "portfolioFit", "macroSensitivity"].includes(s.key)
                        )
                        .map((signal) => (
                          <div key={signal.key} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{signal.label}</p>
                            <p className="mt-2 text-sm font-semibold text-white">{signal.value}</p>
                          </div>
                        ))}
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Macro Summary</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{intelligence.macroSummary}</p>
                    </div>
                  </div>
                ) : null}

                {activeTab === "Peers" ? (
                  <div className="space-y-3">
                    <SectionHeader
                      title="Peer Comparison"
                      subtitle={`${selectedAsset.sector} sector — ranked by momentum`}
                    />
                    <div className="space-y-2">
                      {(sectorMovers.find((s) => s.sector === selectedAsset.sector)?.leaders ?? topGainers.map((a) => a.symbol))
                        .slice(0, 8)
                        .map((sym, i) => {
                          const peer = assets.find((a) => a.symbol === sym);
                          return (
                            <div
                              key={sym}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                                sym === selectedAsset.symbol
                                  ? "border-sky-400/20 bg-sky-500/[0.06]"
                                  : "border-white/8 bg-white/[0.02]"
                              }`}
                            >
                              <span className="w-4 text-[10px] text-slate-600">{i + 1}</span>
                              <p className="flex-1 text-xs font-medium text-white">{sym}</p>
                              {peer ? (
                                <p
                                  className={`text-[11px] ${peer.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                                >
                                  {fmtPercent(peer.changePercent, true)}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : null}

                {activeTab === "Institutional" ? (
                  <div className="space-y-3">
                    <SectionHeader title="Institutional Activity" subtitle="Accumulation, distribution, and flow signals" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {intelligence.proprietarySignals
                        .filter((s) => ["accumulationDistribution", "sectorLeadership", "convictionScore"].includes(s.key))
                        .map((signal) => (
                          <div key={signal.key} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{signal.label}</p>
                              <StatusPill label={signal.tone.toUpperCase()} tone={signal.tone} />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-white">{signal.value}</p>
                          </div>
                        ))}
                    </div>
                    <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.05] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-amber-400/80">Portfolio Impact</p>
                      <div className="mt-2 space-y-1.5">
                        {[
                          `${selectedAsset.symbol}: ${selectedAsset.changePercent >= 0 ? "positive" : "negative"} momentum in ${selectedAsset.market} sleeve.`,
                          `Sector rank: #${Math.max(1, sectorMovers.findIndex((s) => s.sector === selectedAsset.sector) + 1)} in current rotation.`,
                        ].map((line) => (
                          <p key={line} className="text-xs text-slate-300">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Bottom watchlist action */}
              <div className="border-t border-white/8 px-4 py-2 flex items-center justify-between gap-3">
                <p className="text-[10px] text-slate-600">
                  {selectedAsset.kind} · {selectedAsset.market}
                </p>
                <button
                  type="button"
                  className="v2-action text-[10px]"
                  onClick={() => toggleWatchlist(selectedAsset.symbol)}
                >
                  {watchlist.some((w) => w.symbol === selectedAsset.symbol) ? "Unwatch" : "Add to Watchlist"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-slate-500">Select an asset from the left rail to open the analysis terminal.</p>
            </div>
          )}
        </div>

        {/* ── Right: AI conviction rail ── */}
        <div className="border-l border-white/8 flex flex-col gap-0 overflow-y-auto">
          <div className="border-b border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-sky-400/70">Conviction Engine</p>
          </div>

          {selectedAsset ? (
            <div className="p-3 space-y-3">
              {/* Conviction gauge */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-2">Overall Conviction</p>
                <ConvictionBar score={conviction} />
                <p className="mt-2 text-[11px] text-slate-400">
                  {conviction >= 80 ? "Strong Buy Signal" : conviction >= 65 ? "Moderate Signal" : "Watch Zone"}
                </p>
              </div>

              {/* Top movers context */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-2">Top Gainers Today</p>
                <div className="space-y-1.5">
                  {topGainers.slice(0, 4).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <p className="text-xs text-slate-300">{a.symbol}</p>
                      <p className="text-[11px] text-emerald-400">{fmtPercent(a.changePercent, true)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk alerts */}
              {intelligence.riskAlerts.length > 0 ? (
                <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.05] px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-amber-400/70 mb-2">Risk Alerts</p>
                  <div className="space-y-1.5">
                    {intelligence.riskAlerts.slice(0, 3).map((alert) => (
                      <p key={alert} className="text-[11px] text-amber-100/80 leading-5">
                        {alert}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Top losers */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-2">Pressure Zones</p>
                <div className="space-y-1.5">
                  {topLosers.slice(0, 4).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <p className="text-xs text-slate-300">{a.symbol}</p>
                      <p className="text-[11px] text-rose-400">{fmtPercent(a.changePercent, true)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI insight feed */}
              {intelligence.aiInsights.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">AI Feed</p>
                  {intelligence.aiInsights.slice(0, 2).map((insight) => (
                    <IntelligenceCard
                      key={insight.title}
                      title={insight.title}
                      message={insight.message}
                      confidence={insight.confidence}
                      tone="info"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-3">
              <p className="text-[11px] text-slate-500">Conviction signals will appear when an asset is selected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile fallback — compact stacked */}
      <div className="md:hidden p-3 space-y-3">
        <SearchCommandBar value={query} onChange={setQuery} placeholder="Search assets..." label="Stock search" />
        <div className="space-y-2">
          {sidebarAssets.slice(0, 6).map((item) => (
            <AssetRow key={item.id} item={item} selected={selectedAsset?.id === item.id} onSelect={onSelect} />
          ))}
        </div>
        {selectedAsset ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-base font-bold text-white">{selectedAsset.symbol}</p>
            <p className="text-xs text-slate-400">{selectedAsset.name}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MetricTile
                label="Price"
                value={selectedAsset.price > 0 ? formatPrice(selectedAsset) : "—"}
                change={fmtPercent(selectedAsset.changePercent, true)}
                positive={selectedAsset.changePercent >= 0}
              />
              <MetricTile label="Volume" value={formatVolume(selectedAsset.volume)} />
            </div>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
