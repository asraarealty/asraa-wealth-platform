"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { IntelligenceCard, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { SearchCommandBar } from "@/components/v2/workspace";
import { RuntimeObservabilityBadges } from "@/components/runtime/RuntimeObservabilityBadges";
import { fmtPercent, fmtLastUpdated } from "@/lib/formatters";
import { useMarketDomainGraph, scoreAssetConviction, useMarketIntelligenceEngine, type MarketAsset } from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";

const MIN_SEARCH_LENGTH = MARKET_SEARCH_MIN_QUERY_LENGTH;

const SCREENER_FILTERS = ["All", "Momentum", "Value", "Recovery", "Breakout", "Accumulation"] as const;
type ScreenerFilter = (typeof SCREENER_FILTERS)[number];

const SECTOR_CHIPS = ["All Sectors", "AI", "Banking", "Pharma", "Energy", "Metals", "Tech", "Defense", "India Growth", "Global Tech"] as const;
type SectorChip = (typeof SECTOR_CHIPS)[number];

const SECTOR_CHIP_MAP: Record<Exclude<SectorChip, "All Sectors" | "India Growth" | "Global Tech">, string[]> = {
  AI: ["ai", "technology", "software"],
  Banking: ["financials", "banking", "finance"],
  Pharma: ["healthcare", "pharma", "biotech"],
  Energy: ["energy", "oil", "gas"],
  Metals: ["metals", "metal", "mining", "precious metal"],
  Tech: ["technology", "communication", "software", "ai"],
  Defense: ["defense", "aerospace", "industrials"],
};

interface Opportunity {
  asset: MarketAsset;
  conviction: number;
  thesis: string;
  tag: string;
}

function buildOpportunities(
  assets: MarketAsset[],
  sectorMovers: Array<{ sector: string; avgChangePercent: number; leaders: string[] }>,
  trendingAssets: MarketAsset[],
  opportunities: string[]
): Opportunity[] {
  return assets
    .filter((a) => a.changePercent !== 0)
    .map((a) => {
      const sectorIdx = sectorMovers.findIndex((s) => s.sector.toLowerCase() === a.sector.toLowerCase());
      const sectorRank = sectorIdx < 0 ? sectorMovers.length + 1 : sectorIdx + 1;
      const conviction = scoreAssetConviction(a.changePercent, sectorRank, a.volume);

      const isTrending = trendingAssets.some((t) => t.symbol === a.symbol);
      const isLeader = sectorMovers.some((s) => s.leaders.includes(a.symbol));
      const aiMention = opportunities.some((o) => o.toLowerCase().includes(a.symbol.toLowerCase()));

      let thesis = "Tracking market momentum";
      let tag = "Monitor";

      if (a.changePercent >= 3 && isLeader) {
        thesis = "Sector leader with strong institutional flows";
        tag = "Breakout";
      } else if (a.changePercent <= -3 && conviction >= 65) {
        thesis = "Deep discount with recovery conviction signal";
        tag = "Recovery";
      } else if (isTrending && conviction >= 70) {
        thesis = "Trending asset with AI conviction overlay";
        tag = "Momentum";
      } else if (aiMention) {
        thesis = "AI-flagged opportunity in current intelligence scan";
        tag = "AI Pick";
      } else if (a.changePercent >= 1 && isLeader) {
        thesis = "Sector accumulation signal detected";
        tag = "Accumulation";
      }

      return { asset: a, conviction, thesis, tag };
    })
    .sort((x, y) => y.conviction - x.conviction)
    .slice(0, 30);
}

function applyScreenerFilter(items: Opportunity[], filter: ScreenerFilter): Opportunity[] {
  if (filter === "All") return items;
  const tagMap: Record<Exclude<ScreenerFilter, "All">, string[]> = {
    Momentum: ["Momentum", "Breakout"],
    Value: ["Recovery"],
    Recovery: ["Recovery"],
    Breakout: ["Breakout"],
    Accumulation: ["Accumulation", "AI Pick"],
  };
  const tags = tagMap[filter] ?? [];
  return items.filter((o) => tags.includes(o.tag));
}

function applySectorChip(items: Opportunity[], chip: SectorChip): Opportunity[] {
  if (chip === "All Sectors") return items;
  if (chip === "India Growth") return items.filter((o) => o.asset.market === "India");
  if (chip === "Global Tech") {
    return items.filter(
      (o) =>
        o.asset.market === "Global" &&
        ["technology", "communication", "ai"].some((t) =>
          o.asset.sector.toLowerCase().includes(t)
        )
    );
  }
  const targets = SECTOR_CHIP_MAP[chip];
  return items.filter((o) =>
    targets.some(
      (t) =>
        o.asset.sector.toLowerCase().includes(t) ||
        o.asset.category.toLowerCase().includes(t)
    )
  );
}

const TAG_STYLES: Record<string, string> = {
  Breakout: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  Recovery: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  Momentum: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  "AI Pick": "border-amber-400/30 bg-amber-500/10 text-amber-300",
  Accumulation: "border-teal-400/30 bg-teal-500/10 text-teal-300",
  Monitor: "border-white/10 bg-white/[0.03] text-slate-400",
};

const OpportunityCard = memo(function OpportunityCard({
  item,
  onAdd,
}: {
  item: Opportunity;
  onAdd: (symbol: string) => void;
}) {
  const barColor =
    item.conviction >= 80
      ? "bg-emerald-400"
      : item.conviction >= 65
      ? "bg-sky-400"
      : item.conviction >= 50
      ? "bg-amber-400"
      : "bg-rose-400";

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 flex flex-col gap-2 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{item.asset.symbol}</p>
          <p className="text-[10px] text-slate-500 truncate">{item.asset.name}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${TAG_STYLES[item.tag] ?? TAG_STYLES["Monitor"]}`}>
          {item.tag}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-4">{item.thesis}</p>

      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-white/10">
          <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${item.conviction}%` }} />
        </div>
        <p
          className={`shrink-0 text-xs font-semibold tabular-nums ${
            item.asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {fmtPercent(item.asset.changePercent, true)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <p className="text-[9px] text-slate-600">Conviction: {item.conviction}/100</p>
        <button
          type="button"
          className="v2-action text-[10px]"
          onClick={() => onAdd(item.asset.symbol)}
        >
          + Watch
        </button>
      </div>
    </div>
  );
});

const THEMES = [
  { label: "India Recovery", description: "Domestic growth + rate pivot thesis", color: "text-sky-300" },
  { label: "Global Tech", description: "AI & semiconductor cycle momentum", color: "text-violet-300" },
  { label: "Commodities Cycle", description: "Supply constraints + EM demand", color: "text-amber-300" },
  { label: "Defensive Rotation", description: "Risk-off flows into quality names", color: "text-emerald-300" },
];

export function DiscoverEngine() {
  const {
    assets,
    trendingAssets,
    sectorMovers,
    watchlist,
    search,
    runtime,
    searchMarket,
    toggleWatchlist,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();

  const intelligence = useMarketIntelligenceEngine(null, sectorMovers, watchlist);

  const [query, setQuery] = useState("");
  const [screenerFilter, setScreenerFilter] = useState<ScreenerFilter>("All");
  const [sectorChip, setSectorChip] = useState<SectorChip>("All Sectors");

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  const opportunities = useMemo(
    () => buildOpportunities(assets, sectorMovers, trendingAssets, intelligence.opportunities),
    [assets, sectorMovers, trendingAssets, intelligence.opportunities]
  );

  const filteredOpportunities = useMemo(() => {
    const byScreener = applyScreenerFilter(opportunities, screenerFilter);
    return applySectorChip(byScreener, sectorChip);
  }, [opportunities, screenerFilter, sectorChip]);

  const searchResults = useMemo(
    () =>
      query.trim().length >= MIN_SEARCH_LENGTH
        ? [
            ...(search.groups.stocks ?? []),
            ...(search.groups.etfs ?? []),
            ...(search.groups.mutualFunds ?? []),
            ...(search.groups.commodities ?? []),
          ].slice(0, 10)
        : [],
    [query, search.groups]
  );

  const updatedAt = fmtLastUpdated(lastUpdated);

  return (
    <SurfaceCard className="p-0 overflow-hidden">
      {/* Discovery engine header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/20">
            <span className="text-[9px] font-bold text-amber-300">DC</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-400/80">Discovery Engine</p>
            <p className="text-[11px] text-slate-500">
              AI opportunity generation · screener · thematic baskets
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
        <RuntimeObservabilityBadges
          runtime={runtime}
          commodityUnavailable={search.commodityUnavailable}
        />
      </div>

      {/* Screener bar */}
      <div className="border-b border-white/8 px-4 py-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] max-w-sm">
              <SearchCommandBar
                value={query}
                onChange={setQuery}
                placeholder="Search ideas, sectors, themes..."
                label="Discovery screener"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SCREENER_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setScreenerFilter(f)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    screenerFilter === f
                      ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {/* Sector/theme chip filters */}
          <div className="flex flex-wrap gap-1.5">
            {SECTOR_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setSectorChip(chip)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                  sectorChip === chip
                    ? "border-amber-400/35 bg-amber-500/12 text-amber-200"
                    : "border-white/8 bg-white/[0.02] text-slate-500 hover:text-slate-300"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] overflow-hidden">
        {/* ── Center: Opportunity screener ── */}
        <div className="border-r border-white/8 overflow-y-auto">
          {/* Search results overlay */}
          {searchResults.length > 0 ? (
            <div className="border-b border-white/8 p-3">
              <p className="mb-2 text-[9px] uppercase tracking-[0.14em] text-slate-500">Search Results</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">{item.symbol}</p>
                      <p className="text-[10px] text-slate-500 truncate">{item.name}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <p
                        className={`text-[11px] font-medium ${
                          item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {fmtPercent(item.changePercent, true)}
                      </p>
                      <button
                        type="button"
                        className="v2-action text-[10px]"
                        onClick={() => toggleWatchlist(item.symbol)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Opportunity cards grid */}
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader
                title={screenerFilter === "All" ? "All Opportunities" : screenerFilter}
                subtitle={`${filteredOpportunities.length} ranked ideas · AI conviction`}
              />
            </div>

            {isLoading && opportunities.length === 0 ? (
              <p className="text-xs text-slate-500">Scanning market universe…</p>
            ) : filteredOpportunities.length === 0 ? (
              <p className="text-xs text-slate-500">No opportunities match current filter.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredOpportunities.slice(0, 12).map((item) => (
                  <OpportunityCard key={item.asset.id} item={item} onAdd={toggleWatchlist} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: AI insights + thematic clusters ── */}
        <div className="overflow-y-auto">
          {/* AI discovery feed */}
          <div className="border-b border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-amber-400/70">AI Discovery Feed</p>
          </div>

          <div className="p-3 space-y-2">
            {intelligence.aiInsights.length > 0 ? (
              intelligence.aiInsights.slice(0, 5).map((insight) => (
                <IntelligenceCard
                  key={insight.title}
                  title={insight.title}
                  message={insight.message}
                  confidence={insight.confidence}
                  tone="info"
                />
              ))
            ) : (
              <p className="text-[11px] text-slate-500">AI feed initializing…</p>
            )}
          </div>

          {/* Thematic baskets */}
          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Thematic Baskets</p>
          </div>
          <div className="p-3 space-y-2">
            {THEMES.map((theme) => (
              <div
                key={theme.label}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
              >
                <p className={`text-xs font-semibold ${theme.color}`}>{theme.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{theme.description}</p>
              </div>
            ))}
          </div>

          {/* Sector breakouts */}
          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Sector Breakouts</p>
          </div>
          <div className="p-3 space-y-1.5">
            {sectorMovers
              .filter((s) => s.avgChangePercent >= 1)
              .slice(0, 5)
              .map((sector) => (
                <div
                  key={sector.sector}
                  className="flex items-center justify-between gap-2 rounded-lg border border-emerald-400/10 bg-emerald-500/[0.04] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-white truncate">{sector.sector}</p>
                    <p className="text-[9px] text-slate-500 truncate">{sector.leaders.slice(0, 2).join(" · ")}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-emerald-400">
                    {fmtPercent(sector.avgChangePercent, true)}
                  </p>
                </div>
              ))}
            {sectorMovers.filter((s) => s.avgChangePercent >= 1).length === 0 ? (
              <p className="text-[11px] text-slate-500">No breakout sectors detected.</p>
            ) : null}
          </div>

          {/* Macro rotation signals */}
          {intelligence.trendAnalysis.length > 0 ? (
            <>
              <div className="border-t border-white/8 px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Rotation Signals</p>
              </div>
              <div className="p-3 space-y-1.5">
                {intelligence.trendAnalysis.slice(0, 4).map((line) => (
                  <p key={line} className="text-[11px] text-slate-400 leading-4">
                    {line}
                  </p>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden border-t border-white/8 p-3 space-y-3">
        <SearchCommandBar value={query} onChange={setQuery} placeholder="Search ideas..." label="Discovery screener" />
        <div className="space-y-2">
          {filteredOpportunities.slice(0, 6).map((item) => (
            <OpportunityCard key={item.asset.id} item={item} onAdd={toggleWatchlist} />
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}
