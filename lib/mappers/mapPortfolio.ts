import { Asset, PortfolioFull } from "../api";

export type PortfolioData = PortfolioFull;
export type Position = Asset;

// ── Raw API types (snake_case from Backend) ───────────────────────────────

export interface RawPosition {
  id: number;
  type?: string;
  name?: string;
  symbol?: string;
  quantity?: number;
  avg_price?: number;
  current_price?: number;
  value?: number;
  allocation?: number;
}

export interface RawPortfolioResponse {
  positions?: RawPosition[];
  total_value?: number;
  stock_value?: number;
  mf_value?: number;
  property_value?: number;
  commodity_value?: number;
  roi_percent?: number;
}

// ── Mapper functions ────────────────────────────────────────────────────────

/**
 * Maps a single backend position to the frontend Asset type.
 * Converts snake_case keys and ensures numeric fields default to 0.
 */
export function mapPosition(raw: RawPosition): Asset {
  // Handle property/real_estate naming variance
  const type = raw.type === "real_estate" ? "property" : (raw.type as Asset["type"]);

  return {
    id: raw.id,
    type: type || "stock",
    name: raw.name ?? "",
    symbol: raw.symbol ?? "",
    quantity: raw.quantity ?? 0,
    avgPrice: raw.avg_price ?? 0,
    currentPrice: raw.current_price ?? 0,
    value: raw.value ?? 0,
    allocation: raw.allocation ?? 0,
  };
}

/**
 * Maps the full portfolio response to the frontend PortfolioFull type.
 * Handles top-level snake_case fields and iterates through positions.
 */
export function mapPortfolio(raw: RawPortfolioResponse): PortfolioFull {
  return {
    positions: Array.isArray(raw.positions)
      ? raw.positions.map(mapPosition)
      : [],
    totalValue: raw.total_value ?? 0,
    stockValue: raw.stock_value ?? 0,
    mfValue: raw.mf_value ?? 0,
    propertyValue: raw.property_value ?? 0,
    commodityValue: raw.commodity_value ?? 0,
    roiPercent: raw.roi_percent ?? 0,
  };
}
