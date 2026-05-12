/**
 * Canonical asset payload builders.
 *
 * Each builder sanitises its inputs, prevents NaN/Infinity values,
 * and returns the exact snake_case shape expected by the backend API.
 */

function safeNumber(value: unknown): number {
  const n = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// ── Stock ──────────────────────────────────────────────────────────

export interface StockPayloadInput {
  clientId: number;
  symbol: string;
  name: string;
  exchange?: string;
  quantity: number | string;
  avgPrice: number | string;
  currentPrice: number | string;
  tags?: string[];
}

export interface CanonicalStockPayload {
  client_id: number;
  type: "stock";
  symbol: string;
  name: string;
  exchange: string | undefined;
  quantity: number;
  avg_price: number;
  current_price: number;
  tags: string[];
}

export function buildStockPayload(input: StockPayloadInput): CanonicalStockPayload {
  return {
    client_id: input.clientId,
    type: "stock",
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    exchange: input.exchange?.trim().toUpperCase() || undefined,
    quantity: safeNumber(input.quantity),
    avg_price: safeNumber(input.avgPrice),
    current_price: safeNumber(input.currentPrice),
    tags: Array.isArray(input.tags) ? input.tags : [],
  };
}

// ── Mutual Fund ────────────────────────────────────────────────────

export interface FundPayloadInput {
  clientId: number;
  fundCode?: string;
  name: string;
  units: number | string;
  avgPrice: number | string;
  currentPrice: number | string;
}

export interface CanonicalFundPayload {
  client_id: number;
  type: "mutual_fund";
  fund_code: string | undefined;
  name: string;
  units: number;
  avg_price: number;
  current_price: number;
}

export function buildFundPayload(input: FundPayloadInput): CanonicalFundPayload {
  return {
    client_id: input.clientId,
    type: "mutual_fund",
    fund_code: input.fundCode?.trim() || undefined,
    name: input.name.trim(),
    units: safeNumber(input.units),
    avg_price: safeNumber(input.avgPrice),
    current_price: safeNumber(input.currentPrice),
  };
}

// ── Commodity ──────────────────────────────────────────────────────

export interface CommodityPayloadInput {
  clientId: number;
  symbol: string;
  name: string;
  exchange?: string;
  quantity: number | string;
  avgPrice: number | string;
  currentPrice: number | string;
}

export interface CanonicalCommodityPayload {
  client_id: number;
  type: "commodity";
  symbol: string;
  name: string;
  exchange: string | undefined;
  quantity: number;
  avg_price: number;
  current_price: number;
}

export function buildCommodityPayload(
  input: CommodityPayloadInput
): CanonicalCommodityPayload {
  return {
    client_id: input.clientId,
    type: "commodity",
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    exchange: input.exchange?.trim().toUpperCase() || undefined,
    quantity: safeNumber(input.quantity),
    avg_price: safeNumber(input.avgPrice),
    current_price: safeNumber(input.currentPrice),
  };
}
