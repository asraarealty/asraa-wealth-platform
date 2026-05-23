"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { RuntimeObservabilityBadges } from "@/components/runtime/RuntimeObservabilityBadges";
import { SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { SearchCommandBar } from "@/components/v2/workspace";
import { useIntelligencePipelineQuery } from "@/domains/intelligence";
import {
  useMarketBreadth,
  useMarketDomainGraph,
  useTopGainers,
  useTopLosers,
  type MarketAsset,
} from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";
import { fmtLastUpdated, fmtPercent } from "@/lib/formatters";

type TerminalTab = "watchlists" | "market-today" | "intelligence";
type WatchlistCategory = "all" | "stocks" | "etfs" | "commodities" | "funds" | "real-estate-linked";

const MONITORING_REFRESH_INTERVAL_MS = 120_000;
const WATCHLIST_ALERT_MOVE_THRESHOLD = 2.5;
const WATCHLIST_ALERT_VOLUME_THRESHOLD = 2_000_000;

const WATCHLIST_CATEGORIES: Array<{ key: WatchlistCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "stocks", label: "Stocks" },
  { key: "etfs", label: "ETFs" },
  { key: "commodities", label: "Commodities" },
  { key: "funds", label: "Funds" },
  { key: "real-estate-linked", label: "Real-estate linked (future)" },
];

function assetMatchesCategory(asset: MarketAsset, category: WatchlistCategory) {
  if (category === "all") return true;
  if (category === "stocks") return asset.kind === "stock" || asset.kind === "global-stock";
  if (category === "etfs") return asset.kind === "etf";
  if (category === "commodities") return asset.kind === "commodity" || asset.kind === "metal";
  if (category === "funds") return asset.kind === "mutual-fund";
  return false;
}

function formatAssetPrice(asset: MarketAsset) {
  return new Intl.NumberFormat(asset.currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: asset.currency,
    maximumFractionDigits: 2,
  }).format(asset.price || 0);
}

function formatVolume(volume: number) {
  if (volume >= 10_000_000) return `${(volume / 10_000_000).toFixed(1)}Cr`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return String(Math.max(0, Math.round(volume)));
}

function getWatchlistAlertTone(asset: MarketAsset): "danger" | "warn" | "info" {
  if (Math.abs(asset.changePercent) >= WATCHLIST_ALERT_MOVE_THRESHOLD) return "danger";
  if (asset.volume >= WATCHLIST_ALERT_VOLUME_THRESHOLD) return "warn";
  return "info";
}

function trendDirection(asset: MarketAsset) {
  if (asset.sparkline.length < 2) return "flat";
  const first = asset.sparkline[0];
  const last = asset.sparkline[asset.sparkline.length - 1];
  if (last > first) return "up";
  if (last < first) return "down";
  return "flat";
}

function SparkTrend({ points }: { points: number[] }) {
  const data = points.length > 1 ? points : [0, 0];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const spread = Math.max(1, max - min);
  const path = data
    .map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 50;
      const y = 18 - ((point - min) / spread) * 14;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const direction = data[data.length - 1] >= data[0];

  return (
    <svg viewBox="0 0 50 18" className="h-[18px] w-[50px]" aria-hidden="true">
      <path d={path} fill="none" stroke={direction ? "#34d399" : "#fb7185"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const WatchlistRow = memo(function WatchlistRow({
  asset,
  onRemove,
  runtimeConnected,
}: {
  asset: MarketAsset;
  onRemove: (symbol: string) => void;
  runtimeConnected: boolean;
}) {
  const alertTone = getWatchlistAlertTone(asset);
  const direction = trendDirection(asset);

  return (
    <tr className="border-t border-white/8 text-xs text-slate-300 transition-colors hover:bg-white/[0.02]">
      <td className="px-3 py-3 align-middle">
        <p className="font-medium text-white">{asset.name}</p>
      </td>
      <td className="px-3 py-3 align-middle font-semibold text-white">{asset.symbol}</td>
      <td className="px-3 py-3 align-middle tabular-nums">{asset.price > 0 ? formatAssetPrice(asset) : "—"}</td>
      <td className={`px-3 py-3 align-middle tabular-nums font-semibold ${asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        {fmtPercent(asset.changePercent, true)}
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusPill label={runtimeConnected ? "Monitoring" : "Delayed"} tone={runtimeConnected ? "success" : "warn"} />
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusPill
          label={alertTone === "danger" ? "⚠ Alert" : alertTone === "warn" ? "◔ Watch" : "○ Stable"}
          tone={alertTone}
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2">
          <SparkTrend points={asset.sparkline} />
          <span className={`text-[10px] uppercase tracking-[0.1em] ${direction === "up" ? "text-emerald-300" : direction === "down" ? "text-rose-300" : "text-slate-500"}`}>
            {direction}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <button type="button" className="text-[11px] text-slate-500 transition-colors hover:text-rose-300" onClick={() => onRemove(asset.symbol)}>
          Remove
        </button>
      </td>
    </tr>
  );
});

function PulseCard({
  title,
  asset,
  placeholder,
}: {
  title: string;
  asset: MarketAsset | null;
  placeholder?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{title}</p>
      {asset ? (
        <>
          <p className="mt-2 text-sm font-semibold text-white">{asset.price > 0 ? formatAssetPrice(asset) : "—"}</p>
          <p className={`mt-1 text-xs font-semibold ${asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtPercent(asset.changePercent, true)}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-slate-500">{placeholder ?? "Awaiting feed"}</p>
        </>
      )}
    </div>
  );
}

function MoversTable({ title, items }: { title: string; items: MarketAsset[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-xs font-semibold text-white">{title}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] border-separate border-spacing-y-1.5 text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-slate-500">
              <th className="px-2">Symbol</th>
              <th className="px-2">Price</th>
              <th className="px-2">Change %</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${title}-${item.id}`} className="rounded-lg bg-white/[0.02]">
                <td className="rounded-l-lg px-2 py-2 font-semibold text-white">{item.symbol}</td>
                <td className="px-2 py-2 tabular-nums text-slate-200">{item.price > 0 ? formatAssetPrice(item) : "—"}</td>
                <td className={`rounded-r-lg px-2 py-2 tabular-nums font-semibold ${item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmtPercent(item.changePercent, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sectorPulseTone(changePercent: number): "Up" | "Down" | "Neutral" {
  if (changePercent > 0.15) return "Up";
  if (changePercent < -0.15) return "Down";
  return "Neutral";
}

function sectorPulseClass(tone: "Up" | "Down" | "Neutral") {
  if (tone === "Up") return "text-emerald-300 border-emerald-400/20 bg-emerald-500/10";
  if (tone === "Down") return "text-rose-300 border-rose-400/20 bg-rose-500/10";
  return "text-slate-300 border-white/10 bg-white/[0.03]";
}

function matchesAnyKeyword(text: string, keywords: string[]) {
  const target = text.toLowerCase();
  return keywords.some((keyword) => target.includes(keyword));
}

export function MarketTerminalWorkspace() {
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
  const topGainers = useTopGainers(6);
  const topLosers = useTopLosers(6);
  const breadth = useMarketBreadth();
  const intelligenceQuery = useIntelligencePipelineQuery();

  const [activeTab, setActiveTab] = useState<TerminalTab>("watchlists");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WatchlistCategory>("all");
  const watchlistCountRef = useRef(watchlist.length);
  const [watchlistChangeEvent, setWatchlistChangeEvent] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MARKET_SEARCH_MIN_QUERY_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, MONITORING_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (watchlist.length !== watchlistCountRef.current) {
      setWatchlistChangeEvent(
        watchlist.length > watchlistCountRef.current
          ? `Watchlist expanded to ${watchlist.length} monitored assets.`
          : `Watchlist reduced to ${watchlist.length} monitored assets.`
      );
      watchlistCountRef.current = watchlist.length;
    }
  }, [watchlist.length]);

  const [addingSymbols, setAddingSymbols] = useState<Set<string>>(new Set());
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(new Set());
  const addFeedbackTimers = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

  // Clean up pending feedback timers on unmount
  useEffect(() => {
    return () => {
      addFeedbackTimers.current.forEach((timers) => timers.forEach(clearTimeout));
    };
  }, []);

  const updatedLabel = fmtLastUpdated(lastUpdated);

  const watchlistByCategory = useMemo(() => {
    return watchlist.filter((asset) => assetMatchesCategory(asset, category));
  }, [category, watchlist]);

  const searchableAssets = useMemo(() => {
    return [
      ...(search.groups.stocks ?? []),
      ...(search.groups.etfs ?? []),
      ...(search.groups.mutualFunds ?? []),
      ...(search.groups.commodities ?? []),
    ]
      // Reject numeric-only symbols and assets without a meaningful symbol/name
      .filter((asset) => {
        if (!asset.symbol || /^\d+$/.test(asset.symbol)) return false;
        if (!asset.name) return false;
        return true;
      })
      .filter((asset, index, arr) => arr.findIndex((entry) => entry.id === asset.id) === index)
      .filter((asset) => !watchlist.some((tracked) => tracked.symbol === asset.symbol))
      .slice(0, 8);
  }, [search.groups.commodities, search.groups.etfs, search.groups.mutualFunds, search.groups.stocks, watchlist]);

  const handleAddToWatchlist = (asset: MarketAsset) => {
    const symbol = asset.symbol;
    // Clear any existing timers for this symbol
    addFeedbackTimers.current.get(symbol)?.forEach(clearTimeout);
    setAddingSymbols((prev) => new Set(prev).add(symbol));
    toggleWatchlist(symbol, asset);
    // Show optimistic "Added ✓" feedback for 2 seconds
    const t1 = setTimeout(() => {
      setAddingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
      setAddedSymbols((prev) => new Set(prev).add(symbol));
      const t2 = setTimeout(() => {
        setAddedSymbols((prev) => {
          const next = new Set(prev);
          next.delete(symbol);
          return next;
        });
        addFeedbackTimers.current.delete(symbol);
      }, 2000);
      addFeedbackTimers.current.set(symbol, [t2]);
    }, 300);
    addFeedbackTimers.current.set(symbol, [t1]);
  };

  const volumeLeaders = useMemo(() => {
    return [...assets]
      .filter((asset) => asset.kind !== "mutual-fund")
      .sort((left, right) => right.volume - left.volume)
      .slice(0, 5);
  }, [assets]);

  const activeMovers = useMemo(() => {
    return [...assets]
      .filter((asset) => asset.kind !== "mutual-fund")
      .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))
      .slice(0, 5);
  }, [assets]);

  const sectorPulse = useMemo(() => {
    const map = [
      { name: "Banking", keywords: ["financial", "bank"] },
      { name: "IT", keywords: ["technology", "software", "it"] },
      { name: "Energy", keywords: ["energy", "oil", "gas", "power"] },
      { name: "Pharma", keywords: ["pharma", "health", "biotech"] },
      { name: "Realty", keywords: ["realty", "real estate", "construction", "infrastructure"] },
      { name: "FMCG", keywords: ["consumer", "fmcg", "staples", "retail"] },
    ];

    return map.map((sector) => {
      const matchingAssets = assets.filter((asset) => matchesAnyKeyword(asset.sector, sector.keywords));
      const avgChange =
        matchingAssets.length > 0
          ? matchingAssets.reduce((sum, asset) => sum + asset.changePercent, 0) / matchingAssets.length
          : 0;
      const tone = sectorPulseTone(avgChange);
      return {
        name: sector.name,
        tone,
      };
    });
  }, [assets]);

  const marketPulseAssets = useMemo(() => {
    const findBySymbol = (...symbols: string[]) =>
      assets.find((asset) => symbols.some((symbol) => asset.symbol.toUpperCase() === symbol.toUpperCase())) ?? null;
    return {
      nifty: findBySymbol("^NSEI"),
      sensex: findBySymbol("^BSESN"),
      bankNifty: findBySymbol("^NSEBANK"),
      midcap: findBySymbol("^NSEMDCP50", "MIDCAP"),
    };
  }, [assets]);

  const watchlistAlerts = useMemo(() => {
    const movementAlerts = watchlist
      .filter((asset) => Math.abs(asset.changePercent) >= WATCHLIST_ALERT_MOVE_THRESHOLD)
      .map((asset) => `${asset.symbol}: unusual movement ${fmtPercent(asset.changePercent, true)}`);

    const volumeAlerts = watchlist
      .filter((asset) => asset.volume >= WATCHLIST_ALERT_VOLUME_THRESHOLD)
      .map((asset) => `${asset.symbol}: volume event (${formatVolume(asset.volume)})`);

    const events = [...movementAlerts, ...volumeAlerts];
    if (watchlistChangeEvent) events.unshift(watchlistChangeEvent);
    return events.slice(0, 6);
  }, [watchlist, watchlistChangeEvent]);

  const portfolioAlerts = useMemo(() => {
    const bySector = new Map<string, number>();
    watchlist.forEach((asset) => {
      bySector.set(asset.sector, (bySector.get(asset.sector) ?? 0) + 1);
    });

    const sectorConcentration = [...bySector.entries()].sort((a, b) => b[1] - a[1])[0];
    const concentrationAlerts: string[] = [];

    if (sectorConcentration && watchlist.length > 0) {
      const concentrationShare = (sectorConcentration[1] / watchlist.length) * 100;
      if (concentrationShare >= 50) {
        concentrationAlerts.push(
          `Concentration risk: ${sectorConcentration[0]} is ${concentrationShare.toFixed(0)}% of monitored holdings.`
        );
      }
    }

    if (watchlist.length === 0) {
      concentrationAlerts.push("Inactive portfolio monitoring: no assets are currently in your watchlist.");
    } else if (breadth.advances === 0 && breadth.declines === 0) {
      concentrationAlerts.push("Allocation imbalance signal unavailable: waiting for market breadth feed.");
    } else if (Math.abs(breadth.advances - breadth.declines) > breadth.total * 0.4) {
      concentrationAlerts.push("Allocation imbalance: market breadth is skewed, review exposure posture.");
    }

    return concentrationAlerts.slice(0, 4);
  }, [breadth.advances, breadth.declines, breadth.total, watchlist]);

  const backendIntelligence = intelligenceQuery.data;

  const realEstateIntelligence = useMemo(() => {
    const source = [
      ...(backendIntelligence?.trendAnalysis ?? []),
      ...(backendIntelligence?.opportunities ?? []),
      ...(backendIntelligence?.riskAlerts ?? []),
      ...(backendIntelligence?.portfolioIntelligence ?? []),
    ];

    return source
      .filter((line) =>
        matchesAnyKeyword(line, ["real estate", "realty", "yield", "rent", "demand", "appreciation", "occupancy"])
      )
      .slice(0, 4);
  }, [backendIntelligence]);

  const hasIntelligence = watchlistAlerts.length > 0 || portfolioAlerts.length > 0 || realEstateIntelligence.length > 0;

  const tabButtonClass = (tab: TerminalTab) =>
    `rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
      activeTab === tab
        ? "border-sky-400/35 bg-sky-500/15 text-sky-100"
        : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
    }`;

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-white/8 bg-black/25 px-4 py-4 sm:px-5">
        <SectionHeader
          eyebrow="Asraa Wealth OS"
          title="Market Terminal"
          subtitle={`Monitoring workspace · websocket-ready architecture · 2-minute monitoring design${updatedLabel ? ` · Updated ${updatedLabel}` : ""}`}
          action={
            <button type="button" className="v2-action" onClick={() => void refresh()}>
              Refresh now
            </button>
          }
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RuntimeObservabilityBadges runtime={runtime} commodityUnavailable={search.commodityUnavailable} />
          <StatusPill label="Auto refresh: 2 min" tone="info" />
          {error ? <StatusPill label="Feed degraded" tone="danger" /> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={tabButtonClass("watchlists")} onClick={() => setActiveTab("watchlists")}>
            My Watchlists
          </button>
          <button type="button" className={tabButtonClass("market-today")} onClick={() => setActiveTab("market-today")}>
            Market Today
          </button>
          <button type="button" className={tabButtonClass("intelligence")} onClick={() => setActiveTab("intelligence")}>
            Asraa Intelligence
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {activeTab === "watchlists" ? (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
              <SearchCommandBar
                value={query}
                onChange={setQuery}
                placeholder="Search and add stocks, ETFs, commodities, or funds..."
                label="Watchlist asset search"
              />
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Categories</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WATCHLIST_CATEGORIES.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCategory(item.key)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        category === item.key
                          ? "border-sky-400/35 bg-sky-500/15 text-sky-100"
                          : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {query.trim().length >= MARKET_SEARCH_MIN_QUERY_LENGTH ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Search results</p>
                <p className="mt-1 text-[11px] text-slate-500">Click an asset to add it to your monitored watchlist.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {searchableAssets.map((asset) => {
                    const isAdding = addingSymbols.has(asset.symbol);
                    const isAdded = addedSymbols.has(asset.symbol);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={isAdding || isAdded}
                        onClick={() => handleAddToWatchlist(asset)}
                        className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-emerald-400/30 hover:bg-white/[0.05] disabled:opacity-70"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">{asset.symbol}</p>
                            <p className="mt-0.5 truncate text-[10px] text-slate-500">{asset.name}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${isAdded ? "bg-emerald-500/20 text-emerald-300" : "bg-white/8 text-slate-400"}`}>
                            {isAdding ? "Adding…" : isAdded ? "Added ✓" : "+ Watch"}
                          </span>
                        </div>
                        <p className={`mt-1 text-[11px] font-semibold ${asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {fmtPercent(asset.changePercent, true)}
                          {asset.price > 0 ? <span className="ml-1.5 text-[10px] font-normal text-slate-500">{formatAssetPrice(asset)}</span> : null}
                        </p>
                      </button>
                    );
                  })}
                  {search.isSearching ? <p className="text-xs text-slate-500">Searching assets…</p> : null}
                  {!search.isSearching && searchableAssets.length === 0 ? (
                    <p className="text-xs text-slate-500">No matching assets available for watchlist addition.</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px]">
                  <thead>
                    <tr className="bg-white/[0.02] text-left text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-3 py-2.5">Asset Name</th>
                      <th className="px-3 py-2.5">Symbol</th>
                      <th className="px-3 py-2.5">Price</th>
                      <th className="px-3 py-2.5">Change %</th>
                      <th className="px-3 py-2.5">Monitoring Status</th>
                      <th className="px-3 py-2.5">Alert Icon</th>
                      <th className="px-3 py-2.5">Mini Trend Indicator</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlistByCategory.map((asset) => (
                      <WatchlistRow
                        key={asset.id}
                        asset={asset}
                        onRemove={toggleWatchlist}
                        runtimeConnected={runtime.connected}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {isLoading && watchlist.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">Loading monitored watchlists…</div>
              ) : null}

              {!isLoading && watchlistByCategory.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <p className="text-base font-semibold text-white">Create your first monitored watchlist.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Build focused monitoring lists for stocks, ETFs, commodities, and funds with live alert tracking.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "market-today" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold text-white">Market Pulse</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <PulseCard title="Nifty" asset={marketPulseAssets.nifty} />
                <PulseCard title="Sensex" asset={marketPulseAssets.sensex} />
                <PulseCard title="Bank Nifty" asset={marketPulseAssets.bankNifty} />
                <PulseCard title="Midcap" asset={marketPulseAssets.midcap} placeholder="Midcap feed pending" />
                <PulseCard title="Global Pulse" asset={null} placeholder="Global pulse placeholder" />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <MoversTable title="Top Gainers" items={topGainers} />
              <MoversTable title="Top Losers" items={topLosers} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Most Active · Volume Leaders</p>
                <div className="mt-3 space-y-2">
                  {volumeLeaders.map((asset) => (
                    <div key={`vol-${asset.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                      <p className="text-xs font-semibold text-white">{asset.symbol}</p>
                      <p className="text-xs tabular-nums text-slate-300">{formatVolume(asset.volume)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Most Active · Active Movers</p>
                <div className="mt-3 space-y-2">
                  {activeMovers.map((asset) => (
                    <div key={`act-${asset.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                      <p className="text-xs font-semibold text-white">{asset.symbol}</p>
                      <p className={`text-xs tabular-nums font-semibold ${asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {fmtPercent(asset.changePercent, true)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Sector Pulse</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {sectorPulse.map((sector) => (
                    <div key={sector.name} className={`rounded-lg border px-3 py-2 ${sectorPulseClass(sector.tone)}`}>
                      <p className="text-xs font-semibold">{sector.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.1em]">{sector.tone}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Market Breadth</p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-emerald-300">Advancing</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">{breadth.advances}</p>
                  </div>
                  <div className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-rose-300">Declining</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">{breadth.declines}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Neutral</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">{breadth.unchanged}</p>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? <p className="text-xs text-slate-500">Refreshing market monitoring sections…</p> : null}
          </div>
        ) : null}

        {activeTab === "intelligence" ? (
          <div className="space-y-4">
            {intelligenceQuery.isLoading ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-500">
                Loading intelligence streams…
              </div>
            ) : null}

            {!intelligenceQuery.isLoading && !hasIntelligence ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-14 text-center">
                <p className="text-base font-semibold text-white">No intelligence available right now.</p>
                <p className="mt-2 text-sm text-slate-500">Intelligence cards will populate when backend-supported signals are available.</p>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Watchlist Alerts</p>
                <div className="mt-3 space-y-2">
                  {watchlistAlerts.length > 0 ? (
                    watchlistAlerts.map((item) => (
                      <div key={item} className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No watchlist alerts detected.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Portfolio Alerts</p>
                <div className="mt-3 space-y-2">
                  {portfolioAlerts.length > 0 ? (
                    portfolioAlerts.map((item) => (
                      <div key={item} className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No portfolio alerts detected.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white">Real Estate Intelligence</p>
                <div className="mt-3 space-y-2">
                  {realEstateIntelligence.length > 0 ? (
                    realEstateIntelligence.map((item) => (
                      <div key={item} className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No real estate intelligence is currently available.</p>
                  )}
                </div>
              </div>
            </div>

            {intelligenceQuery.error ? (
              <p className="text-xs text-rose-300">
                Intelligence source status: {intelligenceQuery.error instanceof Error ? intelligenceQuery.error.message : "degraded"}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
