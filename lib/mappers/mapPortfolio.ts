// ── Raw API types (snake_case — never leak into UI) ────────────────────────

export interface RawPosition {
  id: number;
  type: "stock" | "mf" | "property";
  name: string;
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  value: number;
}

export interface RawPortfolioResponse {
  positions: RawPosition[];
  total_value: number;
  stock_value: number;
  mf_value: number;
  property_value: number;
  roi_percent: number;
}

// ── Mapped types (camelCase — safe for UI consumption) ──────────────────────

export interface Position {
  id: number;
  type: "stock" | "mf" | "property";
  name: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  /** Calculated: ((currentPrice - avgPrice) / avgPrice) * 100 */
  returnPercent: number;
}

export interface PortfolioData {
  positions: Position[];
  totalValue: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  roiPercent: number;
}

// ── Mapper functions ────────────────────────────────────────────────────────

export function mapPosition(raw: RawPosition): Position {
  const avgPrice = raw.avg_price ?? 0;
  const currentPrice = raw.current_price ?? 0;
  const returnPercent =
    avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

  return {
    id: raw.id,
    type: raw.type,
    name: raw.name ?? "",
    symbol: raw.symbol ?? "",
    quantity: raw.quantity ?? 0,
    avgPrice,
    currentPrice,
    value: raw.value ?? 0,
    returnPercent,
  };
}

export function mapPortfolio(raw: RawPortfolioResponse): PortfolioData {
  return {
    positions: Array.isArray(raw.positions)
      ? raw.positions.map(mapPosition)
      : [],
    totalValue: raw.total_value ?? 0,
    stockValue: raw.stock_value ?? 0,
    mfValue: raw.mf_value ?? 0,
    propertyValue: raw.property_value ?? 0,
    roiPercent: raw.roi_percent ?? 0,
  };
}
