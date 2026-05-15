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

function safeString(value: unknown): string {
  return String(value ?? "").trim();
}

function compactPayload<T extends Record<string, unknown>>(payload: T): T {
  const compacted = { ...payload };
  for (const [key, value] of Object.entries(compacted)) {
    if (value === null || value === undefined) {
      delete compacted[key as keyof T];
    }
  }
  return compacted;
}

// ── Stock ──────────────────────────────────────────────────────────

export interface StockPayloadInput {
  clientId?: number;
  symbol: string;
  name: string;
  exchange?: string;
  quantity: number | string;
  avgPrice: number | string;
  currentPrice: number | string;
  tags?: string[];
}

export interface CanonicalStockPayload {
  client_id?: number;
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
  return compactPayload(
    normalizeAssetPayload({
      client_id: input.clientId,
      type: "stock",
      symbol: input.symbol.trim().toUpperCase(),
      name: input.name.trim(),
      exchange: input.exchange?.trim().toUpperCase() || undefined,
      quantity: safeNumber(input.quantity),
      avg_price: safeNumber(input.avgPrice),
      current_price: safeNumber(input.currentPrice),
      tags: Array.isArray(input.tags) ? input.tags : [],
    }) as Record<string, unknown>
  ) as unknown as CanonicalStockPayload;
}

// ── Mutual Fund ────────────────────────────────────────────────────

export interface FundPayloadInput {
  clientId?: number;
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
  client_id?: number;
  type: "mutual_fund";
  fund_code?: string;
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

  return compactPayload(
    normalizeAssetPayload({
      client_id: input.clientId,
      type: input.assetType,
      fund_code: input.fundCode?.trim() || undefined,
      name,
      quantity: safeNumber(quantity),
      avg_price: safeNumber(avgPrice),
      current_price: safeNumber(currentPrice),
    }) as Record<string, unknown>
  ) as unknown as CanonicalFundPayload;
}

// ── Commodity ──────────────────────────────────────────────────────

export interface CommodityPayloadInput {
  clientId?: number;
  symbol: string;
  name: string;
  exchange?: string;
  quantity: number | string;
  avgPrice: number | string;
  currentPrice: number | string;
}

export interface CanonicalCommodityPayload {
  client_id?: number;
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
  return compactPayload(
    normalizeAssetPayload({
      client_id: input.clientId,
      type: "commodity",
      symbol: input.symbol.trim().toUpperCase(),
      name: input.name.trim(),
      exchange: input.exchange?.trim().toUpperCase() || undefined,
      quantity: safeNumber(input.quantity),
      avg_price: safeNumber(input.avgPrice),
      current_price: safeNumber(input.currentPrice),
    }) as Record<string, unknown>
  ) as unknown as CanonicalCommodityPayload;
}

export interface PropertyAssetPayloadInput {
  clientId?: number;
  name: string;
  symbol?: string;
  location?: string;
  quantity?: number | string;
  avgPrice?: number | string;
  currentPrice?: number | string;
  purchasePrice?: number | string;
  purchaseValue?: number | string;
  currentValue?: number | string;
  rentAmount?: number | string;
  rentDueDate?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  tags?: string[];
}

export interface CanonicalPropertyAssetPayload {
  client_id?: number;
  type: "property";
  symbol?: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  purchase_price: number;
  current_value: number;
  address?: string;
  location?: string;
  rent_amount?: number;
  rent_due_date?: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_email?: string;
  tags?: string[];
}

export function buildPropertyAssetPayload(
  input: PropertyAssetPayloadInput
): CanonicalPropertyAssetPayload {
  const purchasePrice = safeNumber(
    input.purchasePrice ?? input.purchaseValue ?? input.avgPrice
  );
  const currentValue = safeNumber(
    input.currentValue ?? input.currentPrice ?? purchasePrice
  );
  const quantity = safeNumber(input.quantity ?? 1);
  const location = safeString(input.location) || undefined;

  return compactPayload({
    ...(normalizeAssetPayload({
      client_id: input.clientId,
      type: "property",
      symbol: safeString(input.symbol) || undefined,
      name: safeString(input.name),
      quantity,
      avg_price: safeNumber(input.avgPrice ?? purchasePrice),
      current_price: safeNumber(input.currentPrice ?? currentValue),
      purchase_price: purchasePrice,
      current_value: currentValue,
      location,
      address: location,
      rent_amount:
        input.rentAmount === undefined ? undefined : safeNumber(input.rentAmount),
      rent_due_date: safeString(input.rentDueDate) || undefined,
      tenant_name: safeString(input.tenantName) || undefined,
      tenant_phone: safeString(input.tenantPhone) || undefined,
      tenant_email: safeString(input.tenantEmail) || undefined,
      tags: Array.isArray(input.tags) ? input.tags : [],
    }) as unknown as CanonicalPropertyAssetPayload),
  });
}
