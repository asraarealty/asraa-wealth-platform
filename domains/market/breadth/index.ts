import type { BreadthMetrics, MarketAsset, MarketOverviewMetric, SectorMover } from "@/domains/market/types";

function tone(changePercent: number): "success" | "warn" | "neutral" {
  if (changePercent > 0) return "success";
  if (changePercent < 0) return "warn";
  return "neutral";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildOverview(items: MarketAsset[]): MarketOverviewMetric[] {
  const equities = items.filter((item) => ["stock", "global-stock", "etf", "index"].includes(item.kind));
  const positive = equities.filter((item) => item.changePercent > 0).length;
  const negative = equities.filter((item) => item.changePercent < 0).length;
  const avgIndian = average(items.filter((item) => item.market === "India").map((item) => item.changePercent));
  const avgGlobal = average(items.filter((item) => item.market === "Global").map((item) => item.changePercent));
  const avgCommodities = average(items.filter((item) => item.market === "Commodity").map((item) => item.changePercent));

  return [
    {
      label: "Indian pulse",
      value: `${avgIndian >= 0 ? "+" : ""}${avgIndian.toFixed(2)}%`,
      delta: `${positive} advancing / ${negative} declining`,
      tone: tone(avgIndian),
    },
    {
      label: "Global pulse",
      value: `${avgGlobal >= 0 ? "+" : ""}${avgGlobal.toFixed(2)}%`,
      delta: `${items.filter((item) => item.market === "Global").length} global leaders`,
      tone: tone(avgGlobal),
    },
    {
      label: "Commodity pulse",
      value: `${avgCommodities >= 0 ? "+" : ""}${avgCommodities.toFixed(2)}%`,
      delta: `${items.filter((item) => item.market === "Commodity").length} tracked contracts`,
      tone: tone(avgCommodities),
    },
    {
      label: "Live breadth",
      value: `${positive}/${Math.max(equities.length, 1)}`,
      delta: "Advancers across liquid universe",
      tone: positive >= negative ? "success" : "warn",
    },
  ];
}

function buildSectorMovers(items: MarketAsset[]): SectorMover[] {
  const bySector = new Map<string, MarketAsset[]>();
  items
    .filter((item) => ["stock", "global-stock", "etf"].includes(item.kind))
    .forEach((item) => {
      const key = item.sector || "Other";
      const existing = bySector.get(key) ?? [];
      existing.push(item);
      bySector.set(key, existing);
    });

  return [...bySector.entries()]
    .map(([sector, sectorItems]) => ({
      sector,
      avgChangePercent: average(sectorItems.map((item) => item.changePercent)),
      leaders: [...sectorItems]
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 3)
        .map((item) => item.symbol),
    }))
    .sort((a, b) => Math.abs(b.avgChangePercent) - Math.abs(a.avgChangePercent))
    .slice(0, 6);
}

export function deriveBreadthMetrics(items: MarketAsset[]): BreadthMetrics {
  const liquid = items.filter((item) => ["stock", "global-stock", "etf", "index"].includes(item.kind));
  const advances = liquid.filter((item) => item.changePercent > 0).length;
  const declines = liquid.filter((item) => item.changePercent < 0).length;
  const unchanged = Math.max(liquid.length - advances - declines, 0);

  const marketPulse = average(liquid.map((item) => item.changePercent));
  const liquidAssets = liquid.filter((item) => item.volume > 0);
  const liquidityRotation =
    liquidAssets.length > 0
      ? average(liquidAssets.map((item) => Math.sign(item.changePercent || 0) * Math.log10(Math.max(item.volume, 1))))
      : 0;

  return {
    total: liquid.length,
    advances,
    declines,
    unchanged,
    marketPulse,
    liquidityRotation,
  };
}

export function deriveMarketCollections(
  items: MarketAsset[],
  options: { watchlistSymbols: string[]; adminTickers: string[] }
) {
  const liquid = items.filter((item) => item.kind !== "mutual-fund");
  const topGainers = [...liquid].sort((a, b) => b.changePercent - a.changePercent).slice(0, 6);
  const topLosers = [...liquid].sort((a, b) => a.changePercent - b.changePercent).slice(0, 6);
  const trendingAssets = [...items]
    .sort((a, b) => Math.abs(b.changePercent) + b.volume / 1_000_000 - (Math.abs(a.changePercent) + a.volume / 1_000_000))
    .slice(0, 8);

  const watchlist = options.watchlistSymbols
    .map((symbol) => items.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()))
    .filter(Boolean) as MarketAsset[];

  const adminTickers = options.adminTickers
    .map((symbol) => items.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()))
    .filter(Boolean) as MarketAsset[];

  return {
    marketOverview: buildOverview(items),
    topGainers,
    topLosers,
    trendingAssets,
    watchlist,
    sectorMovers: buildSectorMovers(items),
    adminTickers,
    breadth: deriveBreadthMetrics(items),
  };
}
