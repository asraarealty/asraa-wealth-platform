"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { SearchCommandBar } from "@/components/v2/workspace";
import { RuntimeObservabilityBadges } from "@/components/runtime/RuntimeObservabilityBadges";
import {
  useMarketBreadth,
  useMarketDomainGraph,
  usePortfolioExposure,
  useSectorRotation,
  useTopGainers,
  useTopLosers,
  type MarketAsset,
} from "@/domains/market";
import { fmtLastUpdated, fmtPercent } from "@/lib/formatters";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";
import { MARKET_SECTOR_CHIPS, SECTOR_CHIP_KEYWORDS, type MarketSectorChip } from "@/domains/market/sectorFilters";

const MIN_SEARCH_LENGTH = MARKET_SEARCH_MIN_QUERY_LENGTH;
const DISCOVER_FILTERS = ["All", "Gainers", "Losers", "Watchlist", "Funds", "Macro"] as const;
type DiscoverFilter = (typeof DISCOVER_FILTERS)[number];
const DISCOVER_SECTOR_CHIPS = ["All Sectors", ...MARKET_SECTOR_CHIPS.filter((chip) => chip !== "All")] as const;
type DiscoverSectorChip = "All Sectors" | Exclude<MarketSectorChip, "All">;

function formatPrice(asset: MarketAsset) {
  return new Intl.NumberFormat(asset.currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: asset.currency,
    maximumFractionDigits: 2,
  }).format(asset.price || 0);
}

function sortByActivity(items: MarketAsset[]) {
  return [...items].sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent));
}

function applySectorChip(items: MarketAsset[], chip: DiscoverSectorChip): MarketAsset[] {
  if (chip === "All Sectors") return items;
  if (chip === "India Growth") return items.filter((item) => item.market === "India");
  if (chip === "Global Tech") {
    return items.filter(
      (item) =>
        item.market === "Global" &&
        ["technology", "communication", "ai"].some((term) => item.sector.toLowerCase().includes(term))
    );
  }
  const targets = SECTOR_CHIP_KEYWORDS[chip];
  return items.filter((item) =>
    targets.some(
      (term) =>
        item.sector.toLowerCase().includes(term) || item.category.toLowerCase().includes(term)
    )
  );
}

const AssetCard = memo(function AssetCard({
  asset,
  onAdd,
}: {
  asset: MarketAsset;
  onAdd: (symbol: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{asset.symbol}</p>
          <p className="truncate text-[11px] text-slate-500">{asset.name}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-400">
          {asset.market}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-slate-600">Price</p>
          <p className="mt-1 text-sm text-white">{formatPrice(asset)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-slate-600">Move</p>
          <p className={`mt-1 text-sm font-semibold ${asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtPercent(asset.changePercent, true)}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.12em] text-slate-600">{asset.sector}</p>
          <p className="truncate text-[11px] text-slate-500">{asset.category}</p>
        </div>
        <button type="button" className="v2-action text-[10px]" onClick={() => onAdd(asset.symbol)}>
          + Watch
        </button>
      </div>
    </div>
  );
});

export function DiscoverEngine() {
  const {
    assets,
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
  const topGainers = useTopGainers(24);
  const topLosers = useTopLosers(24);
  const sectorRotation = useSectorRotation(6);
  const breadth = useMarketBreadth();
  const portfolioExposure = usePortfolioExposure();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DiscoverFilter>("All");
  const [sectorChip, setSectorChip] = useState<DiscoverSectorChip>("All Sectors");

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  const screenedAssets = useMemo(() => {
    const watchlistSymbols = new Set(watchlist.map((item) => item.symbol));
    const base =
      filter === "Gainers"
        ? topGainers
        : filter === "Losers"
        ? topLosers
        : filter === "Watchlist"
        ? watchlist
        : filter === "Funds"
        ? assets.filter((item) => item.kind === "mutual-fund" || item.market === "Fund")
        : filter === "Macro"
        ? assets.filter(
            (item) =>
              item.market === "Macro" ||
              item.market === "Commodity" ||
              item.kind === "index" ||
              item.kind === "forex" ||
              item.kind === "commodity" ||
              item.kind === "metal"
          )
        : sortByActivity(
            assets.filter(
              (item) =>
                !watchlistSymbols.has(item.symbol) ||
                item.kind === "mutual-fund" ||
                item.market === "Macro" ||
                item.market === "Commodity"
            )
          );

    return applySectorChip(sortByActivity(base), sectorChip).slice(0, 18);
  }, [assets, filter, sectorChip, topGainers, topLosers, watchlist]);

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
    <SurfaceCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/20">
            <span className="text-[9px] font-bold text-amber-300">DC</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-400/80">Discover</p>
            <p className="text-[11px] text-slate-500">
              Screeners · sector rotation · thematic coverage
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

      <div className="border-b border-white/8 px-4 py-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px] flex-1 max-w-sm">
              <SearchCommandBar
                value={query}
                onChange={setQuery}
                placeholder="Search tickers, funds, commodities..."
                label="Discover screener"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DISCOVER_FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    filter === item
                      ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DISCOVER_SECTOR_CHIPS.map((chip) => (
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

      <div className="grid md:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
        <div className="border-r border-white/8">
          {searchResults.length > 0 ? (
            <div className="border-b border-white/8 p-3">
              <SectionHeader title="Search results" subtitle={`${searchResults.length} matched instruments`} />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {searchResults.map((item) => (
                  <AssetCard key={item.id} asset={item} onAdd={toggleWatchlist} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="p-3">
            <SectionHeader
              title={filter === "All" ? "Market coverage" : filter}
              subtitle={`${screenedAssets.length} assets after terminal filters`}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {screenedAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} onAdd={toggleWatchlist} />
              ))}
              {isLoading && screenedAssets.length === 0 ? (
                <p className="text-xs text-slate-500">Loading market coverage…</p>
              ) : null}
              {!isLoading && screenedAssets.length === 0 ? (
                <p className="text-xs text-slate-500">No assets match the current screener.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="border-b border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-amber-400/70">Sector Rotation</p>
          </div>
          <div className="space-y-2 p-3">
            {sectorRotation.map((sector) => (
              <div key={sector.sector} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-white">{sector.sector}</p>
                  <p className={`text-xs font-semibold ${sector.avgChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fmtPercent(sector.avgChangePercent, true)}
                  </p>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">{sector.leaders.slice(0, 3).join(" · ") || "No leaders"}</p>
              </div>
            ))}
            {sectorRotation.length === 0 ? <p className="text-[11px] text-slate-500">Rotation data is initializing…</p> : null}
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
                  <div className="h-1.5 rounded-full bg-amber-400/70" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Market Breadth</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-slate-500">Advances</p>
              <p className="mt-1 text-sm font-semibold text-emerald-300">{breadth.advances}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-slate-500">Declines</p>
              <p className="mt-1 text-sm font-semibold text-rose-300">{breadth.declines}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-slate-500">Tracked</p>
              <p className="mt-1 text-sm font-semibold text-white">{breadth.total}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-slate-500">Avg move</p>
              <p className={`mt-1 text-sm font-semibold ${breadth.marketPulse >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {fmtPercent(breadth.marketPulse, true)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
