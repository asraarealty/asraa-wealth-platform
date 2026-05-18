export type MarketAssetKind =
  | "stock"
  | "global-stock"
  | "etf"
  | "mutual-fund"
  | "commodity"
  | "index"
  | "forex"
  | "metal";

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  kind: MarketAssetKind;
  market: "India" | "Global" | "Fund" | "Commodity" | "Macro";
  sector: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  currency: "INR" | "USD";
  sparkline: number[];
  lastUpdated: string;
  searchLabel?: string;
}

export interface MarketOverviewMetric {
  label: string;
  value: string;
  delta: string;
  tone: "success" | "warn" | "neutral";
}

export interface SectorMover {
  sector: string;
  avgChangePercent: number;
  leaders: string[];
}

export interface UnifiedSearchGroups {
  stocks: MarketAsset[];
  etfs?: MarketAsset[];
  mutualFunds: MarketAsset[];
  commodities: MarketAsset[];
  watchlist?: MarketAsset[];
}

export interface BreadthMetrics {
  total: number;
  advances: number;
  declines: number;
  unchanged: number;
  marketPulse: number;
  liquidityRotation: number;
}

export interface MarketSnapshot {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
  assets: MarketAsset[];
  marketOverview: MarketOverviewMetric[];
  topGainers: MarketAsset[];
  topLosers: MarketAsset[];
  trendingAssets: MarketAsset[];
  watchlist: MarketAsset[];
  sectorMovers: SectorMover[];
  adminTickers: MarketAsset[];
  breadth: BreadthMetrics;
  search: {
    query: string;
    isSearching: boolean;
    error: string | null;
    groups: UnifiedSearchGroups;
  };
}

export const EMPTY_SEARCH_GROUPS: UnifiedSearchGroups = {
  stocks: [],
  etfs: [],
  mutualFunds: [],
  commodities: [],
  watchlist: [],
};

export const EMPTY_BREADTH: BreadthMetrics = {
  total: 0,
  advances: 0,
  declines: 0,
  unchanged: 0,
  marketPulse: 0,
  liquidityRotation: 0,
};
