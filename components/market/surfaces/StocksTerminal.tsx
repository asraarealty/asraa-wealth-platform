"use client";

import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { RuntimeObservabilityBadges } from "@/components/runtime/RuntimeObservabilityBadges";
import { SurfaceCard } from "@/components/v2/ui";
import { fmtLastUpdated, fmtPercent } from "@/lib/formatters";
import { useMarketDomainGraph, scoreAssetConviction, useMarketIntelligenceEngine, type MarketAsset } from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";
import type { CommandSearchItem } from "@/domains/market/types";

const MIN_SEARCH_LENGTH = MARKET_SEARCH_MIN_QUERY_LENGTH;
const FINANCIAL_TABS = ["Quarterly", "P&L", "Balance Sheet", "Cash Flow", "Ratios", "Shareholding"] as const;
type FinancialTab = (typeof FINANCIAL_TABS)[number];
const SEARCH_HINT_EXAMPLES = ["INFY", "RELIANCE", "GOLD", "USDINR", "BANKING", "AI", "ENERGY", "NIFTYBEES"] as const;
const SPARKLINE_VERTICAL_PADDING = 4;
const SPARKLINE_VERTICAL_OFFSET = 2;
const BREAKOUT_CHANGE_THRESHOLD = 1.2;
const BREAKOUT_VOLUME_THRESHOLD = 600_000;
const DEFAULT_SECTOR_RANK = 6;
const DEFAULT_NAVIGATOR_SPARKLINE: number[] = [50, 53, 52, 55, 57, 56, 58, 60, 59, 61, 60, 62];
const DISCOVERY_TABS = [
  "Recent",
  "Watchlist",
  "Portfolio Holdings",
  "Top Gainers",
  "Top Losers",
  "Breakouts",
  "AI Momentum",
  "ETFs",
  "Funds",
  "Commodities",
  "Macro Signals",
  "Sector Rotation",
] as const;
type DiscoveryTab = (typeof DISCOVERY_TABS)[number];
const RESEARCH_DRAWERS = [
  "Financials",
  "Ownership",
  "Filings",
  "AI Research",
  "Earnings",
  "Transcripts",
  "News",
  "Macro Context",
] as const;
type ResearchDrawer = (typeof RESEARCH_DRAWERS)[number];

function formatAssetType(kind: MarketAsset["kind"]) {
  switch (kind) {
    case "stock":
      return "Stock";
    case "global-stock":
      return "Global Stock";
    case "etf":
      return "ETF";
    case "mutual-fund":
      return "Fund";
    case "commodity":
      return "Commodity";
    case "metal":
      return "Metal";
    case "forex":
      return "FX";
    case "index":
      return "Index";
    default:
      return "Asset";
  }
}

function commandItemToAsset(item: CommandSearchItem, index: number): MarketAsset {
  const isSector = item.kind === "sector";
  return {
    id: `navigator-${item.kind}-${item.id || index}`,
    symbol: item.label.toUpperCase().replace(/\s+/g, "-"),
    name: item.label,
    kind: "index",
    market: "Macro",
    sector: isSector ? item.label : "Theme",
    category: isSector ? "Sector Signal" : item.label,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: 0,
    currency: "INR",
    sparkline: DEFAULT_NAVIGATOR_SPARKLINE,
    lastUpdated: new Date().toISOString(),
    searchLabel: item.subtitle,
  };
}

function formatPrice(item: MarketAsset) {
  return new Intl.NumberFormat(item.currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: item.currency,
    maximumFractionDigits: 2,
  }).format(item.price || 0);
}

function formatVolume(volume: number) {
  if (volume >= 10_000_000) return `${(volume / 10_000_000).toFixed(1)}Cr`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return String(volume);
}

function formatMarketCap(value: number, currency: MarketAsset["currency"]) {
  if (!value || value <= 0) return "—";
  const formatter = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return formatter.format(value);
}

function classifyCap(marketCap: number) {
  if (marketCap >= 200_000_000_000) return "Large Cap";
  if (marketCap >= 50_000_000_000) return "Mid Cap";
  return "Small Cap";
}

function riskFromAsset(asset: MarketAsset, conviction: number): "Low" | "Moderate" | "High" {
  const volatility = Math.abs(asset.changePercent);
  if (volatility >= 2.8 || conviction < 55) return "High";
  if (volatility >= 1.4 || conviction < 72) return "Moderate";
  return "Low";
}

function convictionLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Constructive";
  if (score >= 50) return "Neutral";
  return "Weak";
}

function tone(score: number) {
  if (score >= 75) return "text-emerald-300";
  if (score >= 60) return "text-sky-300";
  if (score >= 45) return "text-amber-300";
  return "text-rose-300";
}

function normalizeSector(sector?: string | null) {
  return (sector ?? "").toLowerCase();
}

function sparklinePath(points: number[], width = 96, height = 28) {
  const data = points.length > 0 ? points : [0, 0, 0, 0];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const spread = Math.max(1, max - min);
  return data
    .map((p, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((p - min) / spread) * (height - SPARKLINE_VERTICAL_PADDING) - SPARKLINE_VERTICAL_OFFSET;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function isTrendUp(sparkline: number[], changePercent: number) {
  if (sparkline.length > 1) {
    return sparkline[sparkline.length - 1] >= sparkline[0];
  }
  return changePercent >= 0;
}

const AssetRow = memo(function AssetRow({
  item,
  selected,
  highlighted,
  conviction,
  rowId,
  onSelect,
}: {
  item: MarketAsset;
  selected: boolean;
  highlighted: boolean;
  conviction: number;
  rowId: string;
  onSelect: (asset: MarketAsset) => void;
}) {
  const trendUp = isTrendUp(item.sparkline, item.changePercent);
  const trendPath = sparklinePath(item.sparkline);
  const convictionTone = tone(conviction);
  const convictionState = convictionLabel(conviction);

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
      id={rowId}
      type="button"
      role="option"
      aria-selected={selected || highlighted}
      onClick={() => onSelect(item)}
      className={`w-full rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 ${flashClass} ${
        selected
          ? "border-sky-300/50 bg-sky-500/12 shadow-[0_0_0_1px_rgba(125,211,252,0.15)]"
          : highlighted
            ? "border-slate-300/35 bg-white/[0.08]"
            : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{item.symbol}</p>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-slate-200">
              {formatAssetType(item.kind)}
            </span>
            <span className={`rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold ${convictionTone}`}>
              {convictionState}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-300">{item.name}</p>
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {item.sector || "Unclassified"}
            {item.category ? ` · ${item.category}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-400">{item.price > 0 ? formatPrice(item) : "—"}</p>
          <p className={`mt-0.5 text-xs font-semibold tabular-nums ${item.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {fmtPercent(item.changePercent, true)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Conviction {conviction}/100</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
            trendUp ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200" : "border-rose-300/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {trendUp ? "Trend Up" : "Trend Soft"}
        </span>
        <svg viewBox="0 0 96 28" className="h-6 w-24" role="img" aria-label={`Price trend: ${trendUp ? "upward" : "downward"}`}>
          <title>Price trend {trendUp ? "upward" : "downward"}</title>
          <path d={trendPath} fill="none" stroke={trendUp ? "#34d399" : "#fb7185"} strokeWidth={2} strokeLinecap="round" />
        </svg>
      </div>
    </button>
  );
});

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-emerald-400" : score >= 60 ? "bg-sky-400" : score >= 45 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-white">{Math.round(score)}</span>
    </div>
  );
}

function PremiumChart({ asset, conviction }: { asset: MarketAsset; conviction: number }) {
  const points = asset.sparkline?.length
    ? asset.sparkline
    : [asset.price * 0.94, asset.price * 0.97, asset.price, asset.price * 1.01];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = Math.max(1, max - min);
  const width = 800;
  const height = 260;
  const path = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * width;
      const y = height - ((p - min) / spread) * (height - 24) - 12;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const support = min + spread * 0.2;
  const resistance = min + spread * 0.82;
  const latest = points[points.length - 1] ?? asset.price;
  const breakout = latest > resistance;
  const accumulationWidth = Math.max(18, Math.min(72, conviction));

  const valueToY = (value: number) => height - ((value - min) / spread) * (height - 24) - 12;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/85 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Price + AI Overlay</p>
        <p className="text-xs text-slate-400">
          Volume {formatVolume(asset.volume)} · Momentum {fmtPercent(asset.changePercent, true)}
        </p>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/70 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full sm:h-60 lg:h-64">
          <defs>
            <linearGradient id="priceGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={width} height={height} fill="rgba(15,23,42,0.7)" />
          <rect
            x={width * 0.2}
            y={0}
            width={(width * accumulationWidth) / 100}
            height={height}
            fill="rgba(16,185,129,0.08)"
          />
          <line
            x1={0}
            x2={width}
            y1={valueToY(support)}
            y2={valueToY(support)}
            stroke="rgba(248,250,252,0.25)"
            strokeDasharray="8 8"
          />
          <line
            x1={0}
            x2={width}
            y1={valueToY(resistance)}
            y2={valueToY(resistance)}
            stroke="rgba(251,191,36,0.45)"
            strokeDasharray="8 8"
          />
          <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill="url(#priceGlow)" />
          <path d={path} fill="none" stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {breakout ? <circle cx={width - 24} cy={valueToY(latest)} r={6} fill="#10b981" /> : null}
        </svg>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">AI accumulation zone: Active</div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          Breakout detection: {breakout ? "Confirmed" : "Building"}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          Support: {formatPrice({ ...asset, price: support })}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          Resistance: {formatPrice({ ...asset, price: resistance })}
        </div>
      </div>
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
    runtime,
    searchMarket,
    toggleWatchlist,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();

  const [query, setQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("Recent");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [financialTab, setFinancialTab] = useState<FinancialTab>("Quarterly");
  const [dockCollapsed, setDockCollapsed] = useState<string[]>([]);
  const [openDrawers, setOpenDrawers] = useState<Record<ResearchDrawer, boolean>>({
    Financials: false,
    Ownership: false,
    Filings: false,
    "AI Research": true,
    Earnings: false,
    Transcripts: false,
    News: false,
    "Macro Context": false,
  });

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
    setRecentSymbols((prev) => [asset.symbol, ...prev.filter((s) => s !== asset.symbol)].slice(0, 30));
  };

  const sectorNavigatorSignals = useMemo(
    () => (search.groups.sectors ?? []).map((item, index) => commandItemToAsset(item, index)),
    [search.groups.sectors]
  );
  const themeNavigatorSignals = useMemo(
    () => (search.groups.themes ?? []).map((item, index) => commandItemToAsset(item, index)),
    [search.groups.themes]
  );

  const searchResults = useMemo(
    () =>
      query.trim().length >= MIN_SEARCH_LENGTH
        ? [
            ...(search.groups.stocks ?? []),
            ...(search.groups.etfs ?? []),
            ...(search.groups.mutualFunds ?? []),
            ...(search.groups.commodities ?? []),
            ...sectorNavigatorSignals,
            ...themeNavigatorSignals,
          ].slice(0, 24)
        : [],
    [query, search.groups.stocks, search.groups.etfs, search.groups.mutualFunds, search.groups.commodities, sectorNavigatorSignals, themeNavigatorSignals]
  );

  const recentAssets = useMemo(
    () =>
      recentSymbols
        .map((sym) => assets.find((a) => a.symbol.toUpperCase() === sym.toUpperCase()))
        .filter(Boolean) as MarketAsset[],
    [assets, recentSymbols]
  );

  const sectorRankMap = useMemo(
    () =>
      new Map(
        sectorMovers.map((mover, index) => [
          normalizeSector(mover.sector),
          Math.max(1, index + 1),
        ])
      ),
    [sectorMovers]
  );

  const breakoutCandidates = useMemo(
    () =>
      assets
        .filter((asset) => asset.changePercent >= BREAKOUT_CHANGE_THRESHOLD && asset.volume >= BREAKOUT_VOLUME_THRESHOLD)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 20),
    [assets]
  );
  const etfUniverse = useMemo(() => assets.filter((asset) => asset.kind === "etf").slice(0, 20), [assets]);
  const fundUniverse = useMemo(
    () => assets.filter((asset) => asset.kind === "mutual-fund" || asset.market === "Fund").slice(0, 20),
    [assets]
  );
  const commodityUniverse = useMemo(
    () =>
      assets
        .filter((asset) => asset.kind === "commodity" || asset.kind === "metal" || asset.market === "Commodity")
        .slice(0, 20),
    [assets]
  );
  const macroSignals = useMemo(
    () =>
      assets
        .filter((asset) => asset.market === "Macro" || asset.kind === "index" || asset.kind === "forex")
        .slice(0, 20),
    [assets]
  );

  const aiMomentum = useMemo(
    () =>
      [...assets]
        .sort((a, b) => {
          const rankA = sectorRankMap.get(normalizeSector(a.sector)) ?? DEFAULT_SECTOR_RANK;
          const rankB = sectorRankMap.get(normalizeSector(b.sector)) ?? DEFAULT_SECTOR_RANK;
          const scoreA = scoreAssetConviction(a.changePercent, rankA, a.volume);
          const scoreB = scoreAssetConviction(b.changePercent, rankB, b.volume);
          return scoreB - scoreA;
        })
        .slice(0, 20),
    [assets, sectorRankMap]
  );

  const portfolioHoldings = useMemo(() => {
    const watchSymbols = new Set(watchlist.map((w) => w.symbol));
    const fromUniverse = assets.filter((asset) => watchSymbols.has(asset.symbol));
    if (fromUniverse.length > 0) return fromUniverse.slice(0, 20);
    return topGainers.slice(0, 20);
  }, [assets, watchlist, topGainers]);
  const sectorRotationAssets = useMemo(
    () =>
      sectorMovers
        .slice(0, 10)
        .flatMap((sector) => sector.leaders.slice(0, 2))
        .map((symbol) => assets.find((asset) => asset.symbol === symbol))
        .filter(Boolean) as MarketAsset[],
    [sectorMovers, assets]
  );

  const discoveryPools = useMemo(
    () => ({
      Recent: recentAssets.length > 0 ? recentAssets : assets.slice(0, 20),
      Watchlist: watchlist.length > 0 ? watchlist.slice(0, 20) : assets.slice(0, 20),
      "Portfolio Holdings": portfolioHoldings,
      "Top Gainers": topGainers.slice(0, 20),
      "Top Losers": topLosers.slice(0, 20),
      Breakouts: breakoutCandidates,
      "AI Momentum": aiMomentum,
      ETFs: etfUniverse.length > 0 ? etfUniverse : search.groups.etfs ?? [],
      Funds: fundUniverse.length > 0 ? fundUniverse : search.groups.mutualFunds ?? [],
      Commodities: commodityUniverse.length > 0 ? commodityUniverse : search.groups.commodities ?? [],
      "Macro Signals": macroSignals,
      "Sector Rotation": sectorRotationAssets.length > 0 ? sectorRotationAssets : topGainers.slice(0, 20),
    }),
    [
      recentAssets,
      assets,
      watchlist,
      portfolioHoldings,
      topGainers,
      topLosers,
      breakoutCandidates,
      aiMomentum,
      etfUniverse,
      fundUniverse,
      commodityUniverse,
      macroSignals,
      sectorRotationAssets,
      search.groups.etfs,
      search.groups.mutualFunds,
      search.groups.commodities,
    ]
  );

  const sidebarAssets = query.trim().length >= MIN_SEARCH_LENGTH ? searchResults : discoveryPools[activeTab];

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, activeTab]);

  useEffect(() => {
    if (highlightedIndex >= sidebarAssets.length) {
      setHighlightedIndex(Math.max(0, sidebarAssets.length - 1));
    }
  }, [sidebarAssets, highlightedIndex]);

  const sectorRank = selectedAsset
    ? Math.max(
        1,
        sectorMovers.findIndex((s) => normalizeSector(s.sector) === normalizeSector(selectedAsset.sector)) + 1
      )
    : 0;

  const conviction = selectedAsset
    ? scoreAssetConviction(selectedAsset.changePercent, sectorRank || 6, selectedAsset.volume)
    : 0;
  const convictionText = convictionLabel(conviction);

  const riskLevel = selectedAsset ? riskFromAsset(selectedAsset, conviction) : "Moderate";

  const summaryText = useMemo(() => {
    const messages = intelligence.aiInsights
      .slice(0, 3)
      .map((item) => item.message)
      .filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
    return intelligence.macroSummary;
  }, [intelligence.aiInsights, intelligence.macroSummary]);

  const convictionEngine = useMemo(() => {
    if (!selectedAsset) return [] as Array<{ label: string; score: number; note: string }>;
    const valuation = intelligence.proprietarySignals.find((s) => s.key === "valuationPressure")?.value ?? "Contained";
    const accumulation =
      intelligence.proprietarySignals.find((s) => s.key === "accumulationDistribution")?.value ?? "Balanced flows";
    const liquidity = intelligence.proprietarySignals.find((s) => s.key === "liquidityProfile")?.value ?? "Stable";
    const portfolioFit = intelligence.proprietarySignals.find((s) => s.key === "portfolioFit")?.value ?? "65/100";
    const fit = Number.parseInt(portfolioFit, 10) || 65;

    const valuationScore = valuation.includes("High") ? 48 : valuation.includes("Moderate") ? 63 : 78;
    const flowScore = accumulation.toLowerCase().includes("accumulation")
      ? 82
      : accumulation.toLowerCase().includes("distribution")
      ? 44
      : 66;
    const riskStability = riskLevel === "Low" ? 82 : riskLevel === "Moderate" ? 64 : 45;
    const leadershipScore = sectorRank <= 2 ? 84 : sectorRank <= 4 ? 70 : 58;
    const earningsQuality = Math.min(92, Math.max(42, Math.round((fit + leadershipScore + valuationScore) / 3)));

    return [
      {
        label: "Growth Momentum",
        score: Math.min(95, Math.max(35, 58 + selectedAsset.changePercent * 8)),
        note: "Revenue acceleration and trend participation remain constructive.",
      },
      {
        label: "Valuation Strength",
        score: valuationScore,
        note: `Current repricing pressure: ${valuation}.`,
      },
      {
        label: "Institutional Flow",
        score: flowScore,
        note: `${accumulation}; liquidity profile ${liquidity.toLowerCase()}.`,
      },
      {
        label: "Risk Stability",
        score: riskStability,
        note: `Risk regime is currently ${riskLevel.toLowerCase()} for this setup.`,
      },
      {
        label: "Sector Leadership",
        score: leadershipScore,
        note: `Sector rotation rank currently #${sectorRank || "—"}.`,
      },
      {
        label: "Earnings Quality",
        score: earningsQuality,
        note: "Cash-flow resilience and portfolio fit imply quality consistency.",
      },
    ];
  }, [selectedAsset, intelligence.proprietarySignals, riskLevel, sectorRank]);

  const strengths = useMemo(() => {
    const trends = intelligence.trendAnalysis.slice(0, 3);
    const positives = intelligence.aiInsights
      .map((i) => i.message)
      .filter((line) => /strong|improv|accelerat|lead|healthy|quality|cash/i.test(line))
      .slice(0, 2);
    return [...new Set([...positives, ...trends])].slice(0, 4);
  }, [intelligence.aiInsights, intelligence.trendAnalysis]);

  const risks = useMemo(() => {
    const fromAlerts = intelligence.riskAlerts.slice(0, 3);
    const valuation = intelligence.proprietarySignals.find((s) => s.key === "valuationPressure")?.value;
    return [
      ...new Set([
        ...fromAlerts,
        valuation ? `Valuation context: ${valuation}.` : "",
        riskLevel === "High" ? "Volatility is elevated versus core portfolio holdings." : "",
      ]),
    ]
      .filter(Boolean)
      .slice(0, 4);
  }, [intelligence.riskAlerts, intelligence.proprietarySignals, riskLevel]);

  const peerCandidates = useMemo(() => {
    if (!selectedAsset) return [] as MarketAsset[];
    const leaderSymbols =
      sectorMovers.find((s) => normalizeSector(s.sector) === normalizeSector(selectedAsset.sector))?.leaders ?? [];
    const peers = leaderSymbols.map((sym) => assets.find((a) => a.symbol === sym)).filter(Boolean) as MarketAsset[];
    return peers.filter((p) => p.symbol !== selectedAsset.symbol).slice(0, 4);
  }, [selectedAsset, sectorMovers, assets]);

  const portfolioRelevance = useMemo(() => {
    if (!selectedAsset) return [] as string[];
    const sameSector = watchlist.filter((w) => normalizeSector(w.sector) === normalizeSector(selectedAsset.sector)).length;
    const diversificationLine =
      sameSector >= 3
        ? `Increases ${selectedAsset.sector} concentration risk in your tracked universe.`
        : `Improves diversification by adding measured ${selectedAsset.sector} exposure.`;

    return [
      diversificationLine,
      ...intelligence.portfolioIntelligence.slice(0, 3),
      selectedAsset.changePercent >= 0
        ? "Adds current momentum leadership potential to your portfolio mix."
        : "Acts as a watch candidate until momentum confirms a stronger setup.",
      selectedAsset.volume > 1_000_000
        ? "Liquidity profile supports easier portfolio position management."
        : "Lower liquidity suggests smaller sizing and phased accumulation.",
    ]
      .filter(Boolean)
      .slice(0, 4);
  }, [selectedAsset, watchlist, intelligence.portfolioIntelligence]);

  const positioningStrip = useMemo(() => {
    if (!selectedAsset) return [] as Array<{ label: string; value: string }>;
    const institutional =
      intelligence.proprietarySignals.find((s) => s.key === "accumulationDistribution")?.value ?? "Balanced";
    const relative = selectedAsset.changePercent >= 0 ? "Outperforming" : "Lagging";
    return [
      { label: "Sector Rank", value: `#${sectorRank || "—"}` },
      { label: "Institutional Interest", value: institutional },
      { label: "Market Momentum", value: selectedAsset.changePercent >= 0 ? "Constructive" : "Soft" },
      { label: "Relative Strength", value: relative },
      { label: "Analyst Sentiment", value: intelligence.marketSentiment || "Neutral" },
    ];
  }, [selectedAsset, intelligence.proprietarySignals, intelligence.marketSentiment, sectorRank]);

  const radar = useMemo(() => {
    const normalized = intelligence.opportunities.slice(0, 8);
    return {
      Similarity: normalized.slice(0, 2),
      "Higher Growth": normalized.slice(2, 4),
      "Lower Valuation": normalized.slice(4, 6),
      "Lower Risk": normalized.slice(6, 8),
    };
  }, [intelligence.opportunities]);

  const updatedAt = fmtLastUpdated(lastUpdated);

  const quickDiscovery = useMemo(
    () => ({
      "Trending Today": trendingAssets.slice(0, 6),
      "AI Picks": aiMomentum.slice(0, 6),
      "Sector Leaders": sectorMovers
        .slice(0, 4)
        .flatMap((sector) => sector.leaders.slice(0, 1))
        .map((symbol) => assets.find((asset) => asset.symbol === symbol))
        .filter(Boolean) as MarketAsset[],
      "High Volume": [...assets].sort((a, b) => b.volume - a.volume).slice(0, 6),
      "Breakout Candidates": breakoutCandidates.slice(0, 6),
    }),
    [trendingAssets, aiMomentum, sectorMovers, assets, breakoutCandidates]
  );

  const activeDiscoveryLabel = query.trim().length >= MIN_SEARCH_LENGTH ? "Search Results" : activeTab;

  const handleSearchNavigation = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setHighlightedIndex(0);
      return;
    }
    if (sidebarAssets.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, sidebarAssets.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const picked = sidebarAssets[highlightedIndex];
      if (picked) onSelect(picked);
    }
  };

  const toggleDock = (key: string) => {
    setDockCollapsed((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const toggleDrawer = (drawer: ResearchDrawer) => {
    setOpenDrawers((current) => ({ ...current, [drawer]: !current[drawer] }));
  };

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-white/10 bg-black/20 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300/80">AI Equity Intelligence Workspace</p>
            <p className="text-xs text-slate-400">Premium research view{updatedAt ? ` · ${updatedAt}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {error ? <span className="text-xs text-rose-300">Feed error</span> : null}
            <button type="button" className="v2-action text-xs" onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 px-5 py-2.5">
        <RuntimeObservabilityBadges runtime={runtime} commodityUnavailable={search.commodityUnavailable} />
      </div>

      <div className="grid min-h-[760px] xl:grid-cols-[minmax(300px,25%)_minmax(0,50%)_minmax(300px,25%)]">
        <aside className="border-r border-white/10 bg-black/20 p-3 sm:p-4">
          <div
            role="search"
            className="sticky top-0 z-10 -mx-1 rounded-2xl border border-white/10 bg-slate-950/95 p-3 backdrop-blur"
          >
              <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/80">Cross-Asset Research Navigator</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchNavigation}
               placeholder="Search ticker, company, sector, macro theme, ETF, fund, or commodity"
              className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-black/35 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/55 focus:ring-2 focus:ring-sky-300/30"
              role="combobox"
              aria-controls="stocks-discovery-listbox"
              aria-autocomplete="list"
              aria-expanded={sidebarAssets.length > 0}
              aria-label="Company and market search"
              aria-describedby="stocks-search-hints stocks-search-status"
              aria-activedescendant={sidebarAssets[highlightedIndex] ? `stock-discovery-${sidebarAssets[highlightedIndex].id}` : undefined}
            />
            <div id="stocks-search-hints" className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
              {SEARCH_HINT_EXAMPLES.map((hint) => (
                <span key={hint} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                  {hint}
                </span>
              ))}
            </div>
            <p id="stocks-search-status" className="mt-2 text-[11px] text-slate-500">
              {search.isSearching ? "Searching market coverage…" : "Use arrow keys to highlight and Enter to open."}
            </p>
          </div>

          {query.trim().length < MIN_SEARCH_LENGTH ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DISCOVERY_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                    activeTab === tab
                      ? "border-sky-300/45 bg-sky-500/12 text-sky-100"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 space-y-2">
            <p className="px-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{activeDiscoveryLabel}</p>
            <div id="stocks-discovery-listbox" role="listbox" className="max-h-[440px] space-y-1.5 overflow-y-auto pr-1">
              {sidebarAssets.map((item, index) => {
                const rank = sectorRankMap.get(normalizeSector(item.sector)) ?? DEFAULT_SECTOR_RANK;
                const itemConviction = scoreAssetConviction(item.changePercent, rank, item.volume);
                return (
                  <AssetRow
                    key={item.id}
                    item={item}
                    selected={selectedAsset?.id === item.id}
                    highlighted={index === highlightedIndex}
                    conviction={itemConviction}
                    rowId={`stock-discovery-${item.id}`}
                    onSelect={onSelect}
                  />
                );
              })}
              {isLoading && sidebarAssets.length === 0 ? (
                <p className="px-1 text-xs text-slate-500">Loading companies…</p>
              ) : null}
              {!isLoading && sidebarAssets.length === 0 ? (
                 <p className="px-1 text-xs text-slate-500">
                   No assets found. Try ticker, company, sector, macro theme, ETF, fund, or commodity.
                 </p>
               ) : null}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <p className="px-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Quick Discovery</p>
            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {Object.entries(quickDiscovery).map(([label, items]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.length > 0 ? (
                      items.slice(0, 4).map((asset) => (
                        <button
                          key={`${label}-${asset.id}`}
                          type="button"
                          onClick={() => onSelect(asset)}
                          aria-label={`${label}: ${asset.symbol}, ${fmtPercent(asset.changePercent, true)}`}
                          className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/[0.05]"
                        >
                          {asset.symbol} {fmtPercent(asset.changePercent, true)}
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500">No signals yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="border-r border-white/10 p-4 sm:p-5">
          {selectedAsset ? (
            <div className="space-y-4">
              <section className="rounded-xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      {selectedAsset.market === "India" ? "NSE/BSE" : selectedAsset.market}
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white">{selectedAsset.name}</h1>
                    <p className="mt-1 text-sm text-slate-300">{selectedAsset.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-semibold tracking-tight text-white">
                      {selectedAsset.price > 0 ? formatPrice(selectedAsset) : "—"}
                    </p>
                    <p
                      className={`mt-1 text-base font-semibold ${
                        selectedAsset.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {fmtPercent(selectedAsset.changePercent, true)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-400">AI Conviction</p>
                    <p className={`mt-1 text-lg font-semibold ${tone(conviction)}`}>
                      {convictionText} ({conviction}/100)
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-400">Risk Level</p>
                    <p className="mt-1 text-lg font-semibold text-white">{riskLevel}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-400">Sector</p>
                    <p className="mt-1 text-lg font-semibold text-white">{selectedAsset.sector || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-400">Market Cap Category</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {selectedAsset.category || classifyCap(selectedAsset.marketCap)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-400">Market Cap</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {formatMarketCap(selectedAsset.marketCap, selectedAsset.currency)}
                    </p>
                  </div>
                  <div className="flex items-end justify-end rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <button
                      type="button"
                      className="v2-action text-sm"
                      onClick={() => toggleWatchlist(selectedAsset.symbol)}
                    >
                      {watchlist.some((w) => w.symbol === selectedAsset.symbol) ? "Following" : "Follow / Watchlist"}
                    </button>
                  </div>
                </div>
              </section>

              <PremiumChart asset={selectedAsset} conviction={conviction} />

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-sky-300/80">Runtime Signal Layers</p>
                <div className="mt-2 grid gap-2 text-xs text-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Support/Resistance: Live</div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Conviction Zones: Active</div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Liquidity Zones: Tracked</div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Breakout Markers: Monitored</div>
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Research Drawers</p>
                <div className="mt-3 space-y-2">
                  {RESEARCH_DRAWERS.map((drawer) => (
                    <div key={drawer} className="rounded-lg border border-white/10 bg-black/20">
                      <button
                        type="button"
                        onClick={() => toggleDrawer(drawer)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-200"
                      >
                        <span className="uppercase tracking-[0.1em]">{drawer}</span>
                        <span>{openDrawers[drawer] ? "−" : "+"}</span>
                      </button>
                      {openDrawers[drawer] ? (
                        <div className="border-t border-white/10 px-3 py-2 text-xs text-slate-300">
                          {drawer === "Financials" ? (
                            <>
                              <div className="mb-2 flex flex-wrap gap-2">
                                {FINANCIAL_TABS.map((tab) => (
                                  <button
                                    key={tab}
                                    type="button"
                                    onClick={() => {
                                      setFinancialOpen(true);
                                      setFinancialTab(tab);
                                    }}
                                    className={`rounded border px-2 py-1 text-[10px] ${
                                      tab === financialTab
                                        ? "border-sky-300/40 bg-sky-500/10 text-sky-200"
                                        : "border-white/10 bg-black/20 text-slate-300"
                                    }`}
                                  >
                                    {tab}
                                  </button>
                                ))}
                              </div>
                              {financialOpen ? (
                                <p>
                                  {financialTab === "Quarterly"
                                    ? "Quarterly trajectory remains aligned with trend and momentum."
                                    : financialTab === "P&L"
                                    ? "Profitability profile reflects sector rotation."
                                    : financialTab === "Balance Sheet"
                                    ? "Balance sheet quality should be read with risk stability."
                                    : financialTab === "Cash Flow"
                                    ? "Cash-flow inference is tied to institutional flow."
                                    : financialTab === "Ratios"
                                    ? "Ratios align with conviction and valuation pressure."
                                    : "Institutional participation provides ownership context."}
                                </p>
                              ) : (
                                <p>Financial statements are collapsed by default.</p>
                              )}
                            </>
                          ) : null}
                          {drawer !== "Financials" ? (
                            <p>{summaryText || "Research module is loading runtime context for the active symbol."}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-sm text-slate-400">Select a company to open the AI equity research workspace.</p>
            </div>
          )}
        </main>

        <aside className="bg-black/20 p-3 sm:p-4">
          <div className="sticky top-2 space-y-2">
            {[
              {
                key: "conviction",
                title: "Conviction / Valuation / Risk",
                content: (
                  <div className="space-y-2">
                    {convictionEngine.map((entry) => (
                      <div key={entry.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-white">{entry.label}</p>
                          <p className={`text-xs font-semibold ${tone(entry.score)}`}>{Math.round(entry.score)}/100</p>
                        </div>
                        <ScoreBar score={entry.score} />
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "positioning",
                title: "Sector Positioning / Sentiment",
                content: (
                  <div className="grid gap-2">
                    {positioningStrip.map((item) => (
                      <div key={item.label} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <p className="text-[10px] text-slate-400">{item.label}</p>
                        <p className="text-xs font-semibold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "peers",
                title: "Peer Comparison / Institutional Activity",
                content: (
                  <div className="space-y-2">
                    {(peerCandidates.length > 0 ? peerCandidates : topGainers.slice(0, 4)).map((peer) => (
                      <button
                        key={peer.id}
                        type="button"
                        onClick={() => onSelect(peer)}
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left"
                      >
                        <p className="text-xs font-semibold text-white">{peer.symbol}</p>
                        <p className="text-[11px] text-slate-400">{peer.name}</p>
                        <p className="text-[11px] text-slate-300">{fmtPercent(peer.changePercent, true)}</p>
                      </button>
                    ))}
                  </div>
                ),
              },
              {
                key: "signals",
                title: "Catalysts / Opportunity Radar / Decision Lens",
                content: (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/[0.06] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-300/80">Strengths</p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-200">
                        {(strengths.length > 0 ? strengths : ["Quality indicators are stabilizing."]).map((line) => (
                          <li key={line}>• {line}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-300/20 bg-amber-500/[0.06] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-amber-300/80">Risk</p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-200">
                        {(risks.length > 0 ? risks : ["No major risk alert yet; continue monitoring."]).map((line) => (
                          <li key={line}>• {line}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Opportunity Radar</p>
                      <div className="mt-1 space-y-1 text-xs text-slate-300">
                        {Object.entries(radar).map(([group, items]) => (
                          <p key={group}>
                            {group}: {(items.length > 0 ? items : ["No signal"]).join(", ")}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200">
                      {conviction >= 80
                        ? "Decision lens: Buy / Accumulate with active risk controls."
                        : conviction >= 65
                        ? "Decision lens: Watch closely and scale on confirmation."
                        : conviction >= 50
                        ? "Decision lens: Hold / wait for stronger trend alignment."
                        : "Decision lens: Reduce / avoid until quality improves."}
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200">
                      Portfolio fit: {(portfolioRelevance[0] ?? "Portfolio relevance is loading.")}
                    </div>
                  </div>
                ),
              },
            ].map((section) => {
              const collapsed = dockCollapsed.includes(section.key);
              return (
                <section key={section.key} className="rounded-xl border border-white/10 bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => toggleDock(section.key)}
                    className="flex w-full items-center justify-between border-b border-white/10 px-3 py-2 text-left"
                  >
                    <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{section.title}</span>
                    <span className="text-xs text-slate-300">{collapsed ? "Expand" : "Collapse"}</span>
                  </button>
                  {!collapsed ? <div className="max-h-64 overflow-y-auto p-3">{section.content}</div> : null}
                </section>
              );
            })}
          </div>
        </aside>
      </div>
    </SurfaceCard>
  );
}
