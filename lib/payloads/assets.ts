import { safeDecimalNumber } from "@/lib/utils/numberParsing";
import { normalizeAssetPayload } from "@/lib/api/normalizers";

/**
 * Canonical asset payload builders.
 *
 * Each builder sanitises its inputs, prevents NaN/Infinity values,
 * and returns the exact snake_case shape expected by the backend API.
 */

function safeNumber(value: unknown): number {
  return safeDecimalNumber(value, 0);
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
  return normalizeAssetPayload({
    client_id: input.clientId,
    type: "stock",
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    exchange: input.exchange?.trim().toUpperCase() || undefined,
    quantity: safeNumber(input.quantity),
    avg_price: safeNumber(input.avgPrice),
    current_price: safeNumber(input.currentPrice),
    tags: Array.isArray(input.tags) ? input.tags : [],
  }) as CanonicalStockPayload;
}

// ── Mutual Fund ────────────────────────────────────────────────────

export interface FundPayloadInput {
  clientId: number;
  assetType: "mutual_fund";
  fundCode?: string;
  fundName?: string;
  name?: string;
  quantity?: number | string;
  units?: number | string;
  avgNav?: number | string;
  avgPrice?: number | string;
  currentNav?: number | string;
  currentPrice?: number | string;
}

export interface CanonicalFundPayload {
  client_id: number;
  type: "mutual_fund";
  fund_code: string | undefined;
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
}

export function buildFundPayload(input: FundPayloadInput): CanonicalFundPayload {
  const name = (input.fundName ?? input.name ?? "").trim();
  const quantity = input.quantity ?? input.units ?? 0;
  const avgPrice = input.avgNav ?? input.avgPrice ?? 0;
  const currentPrice = input.currentNav ?? input.currentPrice ?? avgPrice;

  return normalizeAssetPayload({
    client_id: input.clientId,
    type: input.assetType,
    fund_code: input.fundCode?.trim() || undefined,
    name,
    quantity: safeNumber(quantity),
    avg_price: safeNumber(avgPrice),
    current_price: safeNumber(currentPrice),
  }) as CanonicalFundPayload;
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
  return normalizeAssetPayload({
    client_id: input.clientId,
    type: "commodity",
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    exchange: input.exchange?.trim().toUpperCase() || undefined,
    quantity: safeNumber(input.quantity),
    avg_price: safeNumber(input.avgPrice),
    current_price: safeNumber(input.currentPrice),
  }) as CanonicalCommodityPayload;
}
