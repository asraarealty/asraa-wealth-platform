export {
  API_BASE_URL,
  ApiError,
  NetworkError,
  fetcher,
  toErrorMessage,
} from "./fetcher";

import { fetcher, ApiError, API_BASE_URL, getToken, NetworkError } from "./fetcher";
import { normalizeSearchResponse } from "./utils/normalizeSearchResponse";
import {
  buildCommodityPayload,
  buildFundPayload,
  buildPropertyAssetPayload,
  buildStockPayload,
} from "./payloads/assets";
import { safeDecimalNumber } from "./utils/numberParsing";
import { normalizeAssetPayload, normalizeClientPayload, type ClientStatus } from "./api/normalizers";
import { API_ROUTES } from "./constants/routes";
import {
  normalizeAssetTicker,
  requiresTicker,
  toFrontendAssetType,
  type FrontendAssetType,
} from "./constants/assetTypes";
import { validateAssetSubmissionPayload } from "./validators";

/* ── Auth ───────────────────────────────────────────────────────────── */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType?: string;
  refreshToken?: string;
  user?: MeResponse;
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return fetcher<LoginResponse>(API_ROUTES.AUTH.LOGIN, {
    method: "POST",
    body: payload,
  });
}

export interface MeResponse {
  id: number;
  name?: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function getMe(): Promise<MeResponse> {
  return fetcher<MeResponse>(API_ROUTES.AUTH.ME);
}

export function logout(): Promise<void> {
  return fetcher<void>(API_ROUTES.AUTH.LOGOUT, { method: "POST" });
}

/* ── Clients ───────────────────────────────────────────────────────── */

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: ClientStatus;
  isActive: boolean;
  createdAt: string;
}

export type AdminClient = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
  status: ClientStatus;
  isActive: boolean;
  approvalStatus?: "pending" | "approved" | "rejected" | "suspended" | "archived";
};

function mapAdminClient(raw: any): AdminClient {
  const safeRaw = raw && typeof raw === "object" ? raw : {};
  // Normalise approval_status from all known backend field shapes
  const approvalStatus: AdminClient["approvalStatus"] =
    safeRaw.approval_status ??
    (safeRaw.is_approved === true || safeRaw.approved === true ? "approved" : undefined);

  const normalized = normalizeClientPayload(safeRaw) as Record<string, unknown>;
  const status = (normalized.status as ClientStatus | undefined) ?? "inactive";
  const name = typeof safeRaw.name === "string" && safeRaw.name.trim() ? safeRaw.name.trim() : "Unknown Client";
  const email = typeof safeRaw.email === "string" && safeRaw.email.trim() ? safeRaw.email.trim() : "unknown@example.com";
  const idNum = Number(safeRaw.id);
  const id = Number.isFinite(idNum) ? idNum : 0;

  return {
    id,
    name,
    email,
    phone: safeRaw.phone ? String(safeRaw.phone) : undefined,
    createdAt: safeRaw.createdAt ?? safeRaw.created_at,
    status,
    isActive: status === "active",
    approvalStatus,
  };
}

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  return fetcher<any[]>(API_ROUTES.CLIENTS.BASE, { signal }).then((rows) =>
    Array.isArray(rows)
      ? rows.map((row) => {
        const normalized = normalizeClientPayload(row) as Record<string, unknown>;
        const status = (normalized.status as ClientStatus | undefined) ?? "inactive";
        return {
          id: Number(row.id),
          name: String(row.name ?? ""),
          email: String(row.email ?? ""),
          phone: row.phone ? String(row.phone) : undefined,
          createdAt: String(row.createdAt ?? row.created_at ?? ""),
          status,
          isActive: status === "active",
        };
      })
      : []
  );
}

export async function fetchAdminClients(
  signal?: AbortSignal
): Promise<AdminClient[]> {
  const data = await fetcher<any[]>(API_ROUTES.CLIENTS.BASE, { signal });
  return Array.isArray(data) ? data.map(mapAdminClient) : [];
}

export function toggleClientStatus(
  id: number,
  isActive: boolean
): Promise<unknown> {
  return fetcher(API_ROUTES.CLIENTS.STATUS(id), {
    method: "PATCH",
    body: { status: isActive ? "active" : "inactive" },
  });
}

export function deleteClient(
  id: number,
  signal?: AbortSignal
): Promise<void> {
  return fetcher<void>(API_ROUTES.CLIENTS.BY_ID(id), {
    method: "DELETE",
    signal,
  });
}

export function updateClient(
  id: number,
  data: Record<string, unknown>
): Promise<unknown> {
  return fetcher<unknown>(API_ROUTES.CLIENTS.BY_ID(id), {
    method: "PATCH",
    body: data,
  });
}

export function approveClient(id: number): Promise<void> {
  return fetcher<void>(API_ROUTES.CLIENTS.APPROVE(id), {
    method: "PATCH",
  });
}

export function restoreClient(id: number): Promise<void> {
  return fetcher<void>(API_ROUTES.CLIENTS.RESTORE(id), {
    method: "PATCH",
  });
}

/* ── Stocks ────────────────────────────────────────────────────────── */

/**
 * Centralized stock endpoint paths (relative to API_BASE_URL).
 *
 * Full request URLs after proxy rewrite:
 *   Frontend  →  /api/v2/stocks/{symbol}
 *   Proxy     →  /stocks/{symbol}       (strips /api/v2)
 *   Backend   →  /stocks/{symbol}
 */
/**
 * @deprecated Use API_ROUTES.STOCKS.* from "@/lib/constants/routes" instead.
 * Kept for backwards-compatibility; internal implementation uses API_ROUTES.
 */
export const stockEndpoints = {
  quote: (symbol: string) => API_ROUTES.STOCKS.QUOTE(symbol),
  search: (q: string) => `${API_ROUTES.STOCKS.SEARCH}?q=${encodeURIComponent(q)}`,
  bulk: API_ROUTES.STOCKS.BULK,
} as const;

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  currentPrice?: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  exchange?: string | null;
  /** Fundamental data — may not be present for all symbols */
  pe?: number | null;
  roe?: number | null;
  roce?: number | null;
  bookValue?: number | null;
}

function toFiniteNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function searchStocks(
  query: string,
  signal?: AbortSignal
): Promise<StockQuote[]> {
  return fetcher<any>(stockEndpoints.search(query), {
    signal,
    noRedirectOn401: true,
  }).then((response) => {
    const items = normalizeSearchResponse(response) as any[];
    return items
      .map((item): StockQuote => {
        const price = toFiniteNumber(
          item?.current_price || item?.currentPrice || item?.price || 0
        );
        return {
          symbol: String(item?.symbol ?? item?.ticker ?? item?.trading_symbol ?? "").trim().toUpperCase(),
          name: String(item?.name ?? item?.company_name ?? item?.companyName ?? "").trim(),
          price,
          currentPrice: price,
          change: toFiniteNumber(item?.change),
          changePercent: toFiniteNumber(item?.change_percent ?? item?.changePercent),
          volume: toFiniteNumber(item?.volume),
          marketCap: toFiniteNumber(item?.market_cap ?? item?.marketCap),
          exchange: item?.exchange ? String(item.exchange).toUpperCase() : null,
          pe: toFiniteNumber(item?.pe) || null,
          roe: toFiniteNumber(item?.roe) || null,
          roce: toFiniteNumber(item?.roce) || null,
          bookValue: toFiniteNumber(item?.book_value ?? item?.bookValue) || null,
        };
      })
      .filter((item) => item.symbol && item.name);
  });
}

export function fetchStockQuote(
  symbol: string,
  signal?: AbortSignal
): Promise<StockQuote> {
  return fetcher<StockQuote>(stockEndpoints.quote(symbol), { signal });
}

export interface RecommendedStock {
  symbol: string;
  name: string;
  price?: number;
  note?: string;
}

export function saveRecommendedStock(
  payload: RecommendedStock,
  signal?: AbortSignal
): Promise<RecommendedStock> {
  return fetcher<RecommendedStock>(API_ROUTES.STOCKS.RECOMMENDED, {
    method: "POST",
    body: payload,
    signal,
  });
}


export function fetchStocksBulk(
  symbols: string[],
  signal?: AbortSignal
): Promise<StockQuote[]> {
  return fetcher<StockQuote[]>(stockEndpoints.bulk, {
    method: "POST",
    body: { symbols },
    signal,
  });
}

/* ── Transactions ─────────────────────────────────────────────────── */

export interface Transaction {
  id: string;
  clientId: string;
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  date: string;
}

export function fetchTransactions(
  userId?: string,
  signal?: AbortSignal
): Promise<Transaction[]> {
  const path = userId
    ? API_ROUTES.TRANSACTIONS.BY_CLIENT(Number(userId))
    : API_ROUTES.TRANSACTIONS.BASE;
  return fetcher<Transaction[]>(path, { signal });
}

/* ── Admin: Users ─────────────────────────────────────────────────── */

export interface User {
  id: number;
  name?: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  return fetcher<User[]>(API_ROUTES.USERS, { signal });
}

/* ── Assets ─────────────────────────────────────────────────────────── */

export type AssetType = FrontendAssetType;

const hasCommodityTag = (tags: unknown): boolean => {
  if (!Array.isArray(tags)) return false;
  return tags.some((tag) => String(tag).trim().toLowerCase() === "commodity");
};

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalUpperText(value: unknown): string | undefined {
  const text = toOptionalText(value);
  return text ? text.toUpperCase() : undefined;
}

function toStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => toOptionalText(item))
    .filter((item): item is string => Boolean(item));
  return normalized.length > 0 ? normalized : [];
}

/** Normalise a raw API response into a typed Asset array. */
const normalizeAssetList = (res: unknown): Asset[] => {
  const list: unknown = Array.isArray(res)
    ? res
    : (res as any)?.data ?? (res as any)?.assets ?? (res as any)?.positions ?? [];

  if (!Array.isArray(list)) {
    return [];
  }

  return (list as any[]).map((a: any) => {
    const normalizedType = toFrontendAssetType(a.type ?? a.asset_type);
    const tags = toStringList(a.tags ?? a.asset_tags) ?? [];
    const type =
      normalizedType === "stock" && hasCommodityTag(tags) ? "commodity" : normalizedType;
    const quantity = toOptionalNumber(a.quantity);
    const purchasePrice =
      toOptionalNumber(a.purchasePrice ?? a.purchase_price ?? a.purchase_value) ??
      (type === "property" ? toOptionalNumber(a.avgPrice ?? a.avg_price) : undefined);
    const currentValue =
      toOptionalNumber(a.currentValue ?? a.current_value) ??
      (type === "property"
        ? toOptionalNumber(a.currentPrice ?? a.current_price)
        : undefined);
    const currentPrice =
      toOptionalNumber(a.currentPrice ?? a.current_price) ??
      (type === "property" ? currentValue : undefined);
    const avgPrice =
      toOptionalNumber(a.avgPrice ?? a.avg_price) ??
      (type === "property" ? purchasePrice : undefined) ??
      0;
    const value =
      toOptionalNumber(a.value) ??
      (type === "property"
        ? currentValue
        : (quantity ?? 0) * (currentPrice ?? avgPrice)) ??
      0;
    return {
      ...a,
      id: Number(a.id ?? 0),
      symbol: normalizeAssetTicker(type, a.symbol ?? a.fund_code ?? a.fundCode),
      name: String(
        a.name ??
          a.fund_name ??
          a.fundName ??
          a.property_name ??
          a.asset_name ??
          ""
      ).trim(),
      quantity,
      avgPrice,
      currentPrice,
      type,
      exchange: toOptionalUpperText(a.exchange ?? a.source),
      currency: a.currency ?? undefined,
      priceUSD: toOptionalNumber(a.priceUSD ?? a.price_usd),
      priceINR: toOptionalNumber(a.priceINR ?? a.price_inr),
      value,
      allocation: toOptionalNumber(a.allocation) ?? 0,
      location: toOptionalText(a.location ?? a.address),
      purchasePrice,
      currentValue,
      rentAmount: toOptionalNumber(a.rentAmount ?? a.rent_amount),
      rentDueDate: toOptionalText(a.rentDueDate ?? a.rent_due_date),
      tenantName: toOptionalText(a.tenantName ?? a.tenant_name),
      tenantPhone: toOptionalText(a.tenantPhone ?? a.tenant_phone),
      tenantEmail: toOptionalText(a.tenantEmail ?? a.tenant_email),
      tags,
      userId: toOptionalNumber(a.userId ?? a.user_id),
      clientId: toOptionalNumber(a.clientId ?? a.client_id ?? a.userId ?? a.user_id),
      createdAt: toOptionalText(a.createdAt ?? a.created_at),
    };
  });
};

export interface Asset {
  id: number;
  type: "stock" | "mf" | "property" | "commodity";
  symbol?: string;
  /** Exchange/source (for example NSE, BSE, MCX, US). */
  exchange?: string;
  /** Native currency of the stock price. */
  currency?: "USD" | "INR";
  name: string;
  quantity?: number;
  avgPrice: number;
  currentPrice?: number;
  /** Current price in USD (stocks only). */
  priceUSD?: number;
  /** Current price in INR (stocks only). All portfolio calculations use this. */
  priceINR?: number;
  value: number;
  allocation: number;
  /** Real estate */
  location?: string;
  purchasePrice?: number;
  currentValue?: number;
  rentAmount?: number;
  rentDueDate?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  /** Common */
  tags?: string[];
  userId?: number;
  /** Preferred over userId: maps to client_id in API payloads */
  clientId?: number;
  createdAt?: string;
}

export type CreateAssetPayload = Omit<
  Asset,
  "id" | "value" | "allocation" | "createdAt"
>;
export type UpdateAssetPayload = Partial<CreateAssetPayload>;

export interface AssetsAllocation {
  stock: number;
  mf: number;
  realEstate: number;
  commodity: number;
}

/**
 * Full portfolio response shape returned by /assets/me or /assets?user_id=...
 * Includes aggregate totals from the backend so the UI does not need to recompute them.
 */
export interface PortfolioFull {
  positions: Asset[];
  totalValue: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  commodityValue: number;
  roiPercent: number;
}

/** Alias kept for backwards-compatibility. */
export type Portfolio = PortfolioFull;

export interface PortfolioMeta {
  totalValue?: number;
  stockValue?: number;
  mfValue?: number;
  propertyValue?: number;
  commodityValue?: number;
  roiPercent?: number;
}

export interface PortfolioResult {
  items: Asset[];
  meta: PortfolioMeta;
}

/**
 * Fetch the portfolio envelope (positions + pre-computed totals) from the backend.
 */
export async function fetchPortfolio(
  userId?: number,
  signal?: AbortSignal
): Promise<PortfolioFull> {
  const path =
    userId !== undefined
      ? API_ROUTES.ASSETS.BY_USER(userId)
      : API_ROUTES.ASSETS.ME;

  let res: any;
  try {
    // `raw` is omitted intentionally: the fetcher automatically unwraps the
    // { success, data } envelope so res arrives as { assets, summary, allocation }.
    res = await fetcher<any>(path, { signal, cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
      return {
        positions: [],
        totalValue: 0,
        stockValue: 0,
        mfValue: 0,
        propertyValue: 0,
        commodityValue: 0,
        roiPercent: 0,
      };
    }
    throw err;
  }

  // After fetcher auto-unwraps { success, data }, res is { assets, summary, allocation }
  // Support both new camelCase format and old snake_case format as fallback.
  const rawPositions: unknown = Array.isArray(res)
    ? res
    : res?.assets ?? res?.positions ?? res?.data ?? [];

  const positions = normalizeAssetList(rawPositions);
  const summary = res?.summary ?? {};

  // Prefer server-provided totals from summary; fall back to client-side computation.
  const totalVal =
    typeof summary.totalValue === "number"
      ? summary.totalValue
      : typeof res?.total_value === "number"
      ? res.total_value
      : positions.reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const totalInvested = positions.reduce(
    (s: number, p: Asset) => s + Number(p.quantity ?? 0) * Number(p.avgPrice ?? 0),
    0
  );

  const stockVal =
    typeof summary.stockValue === "number"
      ? summary.stockValue
      : typeof res?.stock_value === "number"
      ? res.stock_value
      : positions
          .filter((p: Asset) => p.type === "stock")
          .reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const mfVal =
    typeof summary.mfValue === "number"
      ? summary.mfValue
      : typeof res?.mf_value === "number"
      ? res.mf_value
      : positions
          .filter((p: Asset) => p.type === "mf")
          .reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const propertyVal =
    typeof summary.propertyValue === "number"
      ? summary.propertyValue
      : typeof res?.property_value === "number"
      ? res.property_value
      : positions
          .filter((p: Asset) => p.type === "property")
          .reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const commodityVal =
    typeof summary.commodityValue === "number"
      ? summary.commodityValue
      : typeof res?.commodity_value === "number"
      ? res.commodity_value
      : positions
          .filter((p: Asset) => p.type === "commodity")
          .reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const roiVal =
    typeof summary.roiPercent === "number"
      ? summary.roiPercent
      : typeof res?.roi_percent === "number"
      ? res.roi_percent
      : totalInvested > 0
      ? ((totalVal - totalInvested) / totalInvested) * 100
      : 0;

  return {
    positions,
    totalValue: totalVal,
    stockValue: Number(stockVal ?? 0),
    mfValue: Number(mfVal ?? 0),
    propertyValue: Number(propertyVal ?? 0),
    commodityValue: Number(commodityVal ?? 0),
    roiPercent: Number(roiVal ?? 0),
  };
}

/**
 * Fetch portfolio items and return them in the `{ items, meta }` shape.
 */
export async function fetchPortfolioItems(
  clientId?: number,
  signal?: AbortSignal
): Promise<PortfolioResult> {
  const full = await fetchPortfolio(clientId, signal);
  return {
    items: full.positions,
    meta: {
      totalValue: full.totalValue,
      stockValue: full.stockValue,
      mfValue: full.mfValue,
      propertyValue: full.propertyValue,
      commodityValue: full.commodityValue,
      roiPercent: full.roiPercent,
    },
  };
}

/**
 * Fetch all client assets by fetching each user's assets individually via
 * GET /assets?user_id=<id>.  Returns assets grouped by string user id.
 */
export async function fetchAdminGroupedAssets(
  userIds: number[],
  signal?: AbortSignal
): Promise<Record<string, Asset[]>> {
  if (userIds.length === 0) return {};

  const results = await Promise.allSettled(
    userIds.map(async (uid) => {
      const res = await fetcher<any>(API_ROUTES.ASSETS.BY_USER(uid), {
        signal,
        cache: "no-store",
      });
      const assets = normalizeAssetList(res?.assets ?? res);
      return { uid, assets };
    })
  );

  const grouped: Record<string, Asset[]> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      grouped[String(result.value.uid)] = result.value.assets;
    }
  }
  return grouped;
}

/** Fetch all assets (positions) for a specific client. */
export async function fetchAssets(
  userId: number,
  signal?: AbortSignal
): Promise<Asset[]> {
  const full = await fetchPortfolio(userId, signal);
  return full.positions;
}

/** Convert a camelCase asset payload to the snake_case format expected by the backend.
 *  Special handling: clientId and userId both map to client_id. */
function toApiPayload(payload: CreateAssetPayload | UpdateAssetPayload): Record<string, unknown> {
  const p = payload as Record<string, unknown>;
  const generic: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined) continue;
    if (key === "clientId" || key === "userId") {
      generic.client_id = value;
      continue;
    }
    generic[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = value;
  }

  const normalized = normalizeAssetPayload({
    ...p,
    client_id: p.client_id ?? p.clientId ?? p.user_id ?? p.userId,
    avg_price: p.avg_price ?? p.avgPrice,
    current_price: p.current_price ?? p.currentPrice,
    purchase_price: p.purchase_price ?? p.purchasePrice ?? p.purchaseValue,
    current_value: p.current_value ?? p.currentValue,
  });
  return { ...generic, ...normalized };
}

function sanitizeOutgoingPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      sanitized[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      sanitized[key] = trimmed;
      continue;
    }
    if (Array.isArray(value)) {
      sanitized[key] = value
        .map((item) => (typeof item === "string" ? item.trim() : item))
        .filter((item) => item !== undefined && item !== null && item !== "");
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function redactForAssetDebug(input: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      key === "quantity" ||
      key === "avgPrice" ||
      key === "currentPrice" ||
      key === "avg_price" ||
      key === "current_price" ||
      key === "clientId" ||
      key === "client_id" ||
      key === "userId"
    ) {
      redacted[key] = "[redacted]";
      continue;
    }
    redacted[key] = value;
  }
  return redacted;
}

function getAssetValidationErrors(
  payload: CreateAssetPayload | UpdateAssetPayload,
  normalizedPayload: CreateAssetPayload | UpdateAssetPayload,
  requestPayload: Record<string, unknown> | null,
  options: { requireClientId: boolean }
): Record<string, string> {
  const errors: Record<string, string> = {};
  const type = normalizedPayload.type
    ? toFrontendAssetType(normalizedPayload.type)
    : undefined;

  if (options.requireClientId) {
    const targetClientId = safeDecimalNumber(
      normalizedPayload.clientId ?? normalizedPayload.userId,
      0
    );
    if (targetClientId <= 0) {
      errors.clientId = "Client is required";
    }
  }

  const name = String(normalizedPayload.name ?? "").trim();
  if (!name) {
    errors.name = "Name is required";
  }

  if (type && requiresTicker(type) && !normalizedPayload.symbol) {
    errors.symbol =
      type === "mf" ? "Mutual fund code is required" : "Symbol is required";
  }

  const quantity = safeDecimalNumber(normalizedPayload.quantity, 0);
  if (quantity <= 0) {
    errors.quantity = "Quantity must be greater than 0";
  }

  const avgPrice = safeDecimalNumber(normalizedPayload.avgPrice, 0);
  if (avgPrice <= 0) {
    errors.avgPrice = "Average price must be greater than 0";
  }

  const currentPrice = safeDecimalNumber(normalizedPayload.currentPrice, 0);
  if (currentPrice <= 0) {
    errors.currentPrice = "Current price must be greater than 0";
  }

  if (requestPayload && Object.keys(errors).length === 0) {
    const validationMessage = validateAssetSubmissionPayload(requestPayload, {
      requireClientId: options.requireClientId,
    });
    if (validationMessage) {
      errors.request = validationMessage;
    }
  }

  return errors;
}

/**
 * Build the canonical backend payload for supported asset creation flows.
 *
 * Returns `null` for asset types that still use generic camelCase→snake_case
 * translation (currently real-estate/property), so createAsset can fall back
 * to `toApiPayload` for those payloads.
 */
function buildCanonicalAssetPayload(
  payload: CreateAssetPayload | UpdateAssetPayload,
  quantity: number,
  avgPrice: number,
  currentPrice: number,
  options: { requireClientId: boolean }
): Record<string, unknown> | null {
  if (!payload.type) {
    return null;
  }

  const frontendType = toFrontendAssetType(payload.type);
  const targetClientId = Number(payload.clientId ?? payload.userId);
  const resolvedClientId =
    Number.isFinite(targetClientId) && targetClientId > 0 ? targetClientId : undefined;

  if (frontendType === "stock") {
    if (options.requireClientId && !resolvedClientId) {
      throw new Error("Client is required");
    }
    return {
      ...buildStockPayload({
        clientId: resolvedClientId,
        symbol: payload.symbol ?? "",
        name: payload.name ?? "",
        exchange: payload.exchange,
        quantity,
        avgPrice,
        currentPrice,
        tags: payload.tags,
      }),
    };
  }

  if (frontendType === "mf") {
    if (options.requireClientId && !resolvedClientId) {
      throw new Error("Client is required");
    }
    return {
      ...buildFundPayload({
        clientId: resolvedClientId,
        assetType: "mutual_fund",
        fundCode: payload.symbol,
        fundName: payload.name,
        quantity,
        avgNav: avgPrice,
        currentNav: currentPrice,
      }),
    };
  }

  if (frontendType === "commodity") {
    if (options.requireClientId && !resolvedClientId) {
      throw new Error("Client is required");
    }
    return {
      ...buildCommodityPayload({
        clientId: resolvedClientId,
        symbol: payload.symbol ?? "",
        name: payload.name ?? "",
        exchange: payload.exchange,
        quantity,
        avgPrice,
        currentPrice,
      }),
    };
  }

  if (frontendType === "property") {
    if (options.requireClientId && !resolvedClientId) {
      throw new Error("Client is required");
    }
    return {
      ...buildPropertyAssetPayload({
        clientId: resolvedClientId,
        symbol: payload.symbol,
        name: payload.name ?? "",
        location: payload.location,
        quantity,
        avgPrice,
        currentPrice,
        purchasePrice: payload.purchasePrice ?? avgPrice,
        currentValue: payload.currentValue ?? currentPrice,
        rentAmount: payload.rentAmount,
        rentDueDate: payload.rentDueDate,
        tenantName: payload.tenantName,
        tenantPhone: payload.tenantPhone,
        tenantEmail: payload.tenantEmail,
        tags: payload.tags,
      }),
    };
  }

  return null;
}

function prepareAssetRequestPayload(
  payload: CreateAssetPayload | UpdateAssetPayload,
  options: { requireClientId: boolean }
): {
  normalizedPayload: CreateAssetPayload | UpdateAssetPayload;
  requestPayload: Record<string, unknown>;
} {
  const rawPayload = payload as Record<string, unknown>;
  const frontendType = payload.type ? toFrontendAssetType(payload.type) : undefined;
  const targetClientId = safeDecimalNumber(payload.clientId ?? payload.userId, 0);
  const quantity =
    frontendType === "property"
      ? safeDecimalNumber(payload.quantity ?? 1, 1)
      : safeDecimalNumber(payload.quantity, 0);
  const avgPrice = safeDecimalNumber(
    payload.avgPrice ?? payload.purchasePrice ?? rawPayload.purchaseValue,
    0
  );
  const currentPrice = safeDecimalNumber(
    payload.currentPrice ?? payload.currentValue ?? payload.avgPrice,
    avgPrice
  );

  const normalizedPayload: CreateAssetPayload | UpdateAssetPayload = {
    ...payload,
    ...(frontendType ? { type: frontendType } : {}),
    clientId: targetClientId > 0 ? targetClientId : undefined,
    userId: undefined,
    symbol: frontendType
      ? normalizeAssetTicker(frontendType, payload.symbol)
      : toOptionalUpperText(payload.symbol),
    name: String(payload.name ?? "").trim(),
    exchange: toOptionalUpperText(payload.exchange),
    location: toOptionalText(payload.location),
    quantity,
    avgPrice,
    currentPrice,
    purchasePrice: safeDecimalNumber(
      payload.purchasePrice ?? rawPayload.purchaseValue ?? avgPrice,
      avgPrice
    ),
    currentValue: safeDecimalNumber(payload.currentValue ?? currentPrice, currentPrice),
    rentAmount:
      payload.rentAmount === undefined
        ? undefined
        : safeDecimalNumber(payload.rentAmount, 0),
    rentDueDate: toOptionalText(payload.rentDueDate),
    tenantName: toOptionalText(payload.tenantName),
    tenantPhone: toOptionalText(payload.tenantPhone),
    tenantEmail: toOptionalText(payload.tenantEmail),
  };

  const canonicalPayload = buildCanonicalAssetPayload(
    normalizedPayload,
    quantity,
    avgPrice,
    currentPrice,
    options
  );
  const requestPayload = sanitizeOutgoingPayload(
    canonicalPayload ?? toApiPayload(normalizedPayload)
  );

  const validationErrors = getAssetValidationErrors(
    payload,
    normalizedPayload,
    requestPayload,
    options
  );
  if (Object.keys(validationErrors).length > 0) {
    throw new Error(validationErrors[Object.keys(validationErrors)[0]]);
  }

  return {
    normalizedPayload,
    requestPayload,
  };
}

export function createAsset(
  payload: CreateAssetPayload,
  signal?: AbortSignal
): Promise<Asset> {
  let normalizedPayload: CreateAssetPayload | UpdateAssetPayload;
  let requestPayload: Record<string, unknown>;
  try {
    ({ normalizedPayload, requestPayload } = prepareAssetRequestPayload(payload, {
      requireClientId: true,
    }));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[createAsset] validation_failed", {
        rawFormState: redactForAssetDebug(payload as Record<string, unknown>),
        error: error instanceof Error ? error.message : "Validation failed",
      });
    }
    throw error;
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[createAsset] submit", {
      rawFormState: redactForAssetDebug(payload as Record<string, unknown>),
      normalizedPayload: redactForAssetDebug(normalizedPayload as Record<string, unknown>),
      validationResult: { valid: true, rejectedField: null },
      requestPayload: redactForAssetDebug(requestPayload),
    });
  }

  return fetcher<Asset>(API_ROUTES.ASSETS.BASE, {
    method: "POST",
    // Property payloads still travel through generic key translation.
    body: requestPayload,
    signal,
  }).catch((err) => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        throw new ApiError(401, "Session expired. Please sign in again.");
      }
      if (err.status === 409) {
        throw new ApiError(409, err.message || "Duplicate entry — this asset already exists for this client.");
      }
      if (err.status === 422) {
        throw new ApiError(422, err.message || "Validation failed — please check all fields and try again.");
      }
    }
    throw err;
  });
}

export function updateAsset(
  id: number,
  payload: UpdateAssetPayload,
  signal?: AbortSignal
): Promise<Asset> {
  const requestPayload = payload.type
    ? prepareAssetRequestPayload(payload, { requireClientId: false }).requestPayload
    : sanitizeOutgoingPayload(toApiPayload(payload));

  return fetcher<Asset>(API_ROUTES.ASSETS.BY_ID(id), {
    method: "PUT",
    body: requestPayload,
    signal,
  }).catch((err) => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        throw new ApiError(401, "Session expired. Please sign in again.");
      }
      if (err.status === 409) {
        throw new ApiError(409, err.message || "Duplicate entry — this asset already exists for this client.");
      }
      if (err.status === 422) {
        throw new ApiError(422, err.message || "Validation failed — please check all fields and try again.");
      }
    }
    throw err;
  });
}

export function deleteAsset(
  id: number,
  signal?: AbortSignal
): Promise<void> {
  return fetcher<void>(API_ROUTES.ASSETS.BY_ID(id), {
    method: "DELETE",
    signal,
  });
}

/* ── Insights ───────────────────────────────────────────────────────── */

export interface InsightItem {
  id: number | string;
  type: "opportunity" | "risk" | "rebalance" | "trend";
  title: string;
  body: string;
  severity?: "low" | "medium" | "high";
}

export interface InsightsResponse {
  equityPercentage: number;
  realEstatePercentage: number;
  /** Backend may return plain strings or structured InsightItem objects */
  alerts: (string | InsightItem)[];
}

export async function fetchInsights(
  clientId?: number,
  signal?: AbortSignal
): Promise<InsightsResponse> {
  // Admins can request insights for a specific client by passing clientId.
  // All other callers (or admins viewing their own data) use the /insights/me route.
  const path =
    clientId !== undefined
      ? API_ROUTES.INSIGHTS.BY_CLIENT(clientId)
      : API_ROUTES.INSIGHTS.ME;

  const res = await fetcher<any>(path, { signal, raw: true, cache: "no-store" });

  if (res && typeof res === "object" && "alerts" in res) {
    return {
      equityPercentage: Number(res.equity_percentage ?? 0),
      realEstatePercentage: Number(res.real_estate_percentage ?? 0),
      alerts: Array.isArray(res.alerts) ? res.alerts : [],
    };
  }

  // Fallback: if backend returns an array of InsightItem objects
  if (Array.isArray(res)) {
    return { equityPercentage: 0, realEstatePercentage: 0, alerts: [] };
  }

  return { equityPercentage: 0, realEstatePercentage: 0, alerts: [] };
}

/* ── Mutual Funds ───────────────────────────────────────────────────── */

export interface MutualFundResult {
  code: string;
  name: string;
  nav: number;
  category?: string;
  amc?: string;
  aum?: number | null;
  riskLevel?: string;
  fundHouse?: string;
}

export type CommodityAssetType = "spot" | "etf" | "linked";

export interface CommodityResult {
  id: string;
  name: string;
  symbol: string;
  source: string;
  assetType: CommodityAssetType;
  currentPrice?: number | null;
  spotPrice?: number | null;
  dailyChange?: number | null;
}

const COMMODITY_CATALOG: CommodityResult[] = [
  { id: "gold-spot", name: "Gold Spot", symbol: "GOLD", source: "MCX", assetType: "spot" },
  { id: "gold-etf", name: "Gold ETF", symbol: "GOLDBEES.NS", source: "NSE", assetType: "etf" },
  { id: "silver-spot", name: "Silver Spot", symbol: "SILVER", source: "MCX", assetType: "spot" },
  { id: "silver-etf", name: "Silver ETF", symbol: "SILVERBEES.NS", source: "NSE", assetType: "etf" },
  { id: "crude-spot", name: "Crude Oil Spot", symbol: "CRUDEOIL", source: "MCX", assetType: "spot" },
  { id: "crude-linked", name: "Crude Oil Linked Holding", symbol: "CRUDEOIL-LINK", source: "Derived", assetType: "linked" },
  { id: "natgas-spot", name: "Natural Gas Spot", symbol: "NATURALGAS", source: "MCX", assetType: "spot" },
  { id: "natgas-linked", name: "Natural Gas Linked Holding", symbol: "NATGAS-LINK", source: "Derived", assetType: "linked" },
  { id: "copper-spot", name: "Copper Spot", symbol: "COPPER", source: "MCX", assetType: "spot" },
  { id: "copper-linked", name: "Copper Linked Holding", symbol: "COPPER-LINK", source: "Derived", assetType: "linked" },
];

export function searchCommodities(
  query: string,
  signal?: AbortSignal
): Promise<CommodityResult[]> {
  return fetcher<any>(`${API_ROUTES.COMMODITIES.SEARCH}?q=${encodeURIComponent(query)}`, {
    signal,
    noRedirectOn401: true,
  })
    .then((response) => {
      const items = normalizeSearchResponse(response) as any[];
      const mapped = items
        .map((item): CommodityResult => {
          const symbol = String(item?.symbol ?? item?.code ?? "").trim().toUpperCase();
          const spotPrice = toFiniteNumber(item?.spotPrice || 0);
          const currentPrice = toFiniteNumber(
            item?.current_price ||
              item?.currentPrice ||
              item?.spotPrice ||
              item?.price ||
              0
          );
          const rawType = String(item?.asset_type ?? item?.assetType ?? "spot").toLowerCase();
          const assetType: CommodityAssetType =
            rawType === "etf" || rawType === "linked" ? rawType : "spot";
          return {
            id: String(item?.id ?? `${symbol || "commodity"}-${assetType}`),
            name: String(item?.name ?? item?.commodity_name ?? item?.commodityName ?? symbol).trim(),
            symbol,
            source: String(item?.exchange ?? item?.source ?? "MCX").trim().toUpperCase(),
            assetType,
            currentPrice,
            spotPrice,
            dailyChange: toFiniteNumber(item?.daily_change ?? item?.dailyChange),
          };
        })
        .filter((item) => item.symbol && item.name);

      return mapped;
    })
    .catch(() => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return COMMODITY_CATALOG.filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.assetType.toLowerCase().includes(q)
        );
      });
    });
}

export function searchMutualFunds(
  query: string,
  signal?: AbortSignal
): Promise<MutualFundResult[]> {
  return fetcher<any>(
    `${API_ROUTES.MUTUAL_FUNDS.SEARCH}?q=${encodeURIComponent(query)}`,
    { signal, noRedirectOn401: true }
  ).then((response) => {
    const items = normalizeSearchResponse(response) as any[];
    const mapped = items.map((item): MutualFundResult => {
      const navCandidate =
        toFiniteNumber(
            item?.current_nav ||
            item?.currentNav ||
            item?.nav ||
            item?.latestNav ||
            0
        );
      const aumCandidate =
        toFiniteNumber(item?.aum ?? item?.assetsUnderManagement ?? item?.assets_under_management);
      const amc = item.amc ?? item.fundHouse ?? item.fund_house ?? item.amc_name ?? undefined;
      return {
        code: String(item.code ?? item.scheme_code ?? item.schemeCode ?? item.fund_code ?? "").trim(),
        name: String(
          item.name ??
            item.fund_name ??
            item.schemeName ??
            item.scheme_name ??
            item.schemeFullName ??
            item.scheme_full_name ??
            ""
        ).trim(),
        nav: navCandidate > 0 ? navCandidate : 0,
        category: item.category ?? item.schemeCategory ?? item.scheme_category ?? undefined,
        amc,
        aum: aumCandidate > 0 ? aumCandidate : null,
        riskLevel: item.riskLevel ?? item.risk_level ?? item.risk ?? undefined,
        fundHouse: amc,
      };
    });

    const filtered = mapped.filter((item) => item.name && (item.code || item.nav > 0));
    const seen = new Set<string>();
    const deduped: MutualFundResult[] = [];
    for (const item of filtered) {
      const key = item.code
        ? `code:${item.code.toUpperCase()}`
        : `name:${item.name.toLowerCase()}::${(item.amc ?? "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    return deduped;
  });
}

/* ── Auth Extras ───────────────────────────────────────────────────── */

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export function signup(payload: SignupPayload): Promise<void> {
  return fetcher<void>(API_ROUTES.AUTH.REGISTER, {
    method: "POST",
    body: payload,
  });
}

export interface ForgotPasswordPayload {
  email: string;
}

export function forgotPassword(
  payload: ForgotPasswordPayload
): Promise<void> {
  return fetcher<void>(API_ROUTES.AUTH.FORGOT_PASSWORD, {
    method: "POST",
    body: payload,
  });
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export function resetPassword(
  payload: ResetPasswordPayload
): Promise<void> {
  return fetcher<void>(API_ROUTES.AUTH.RESET_PASSWORD, {
    method: "POST",
    body: payload,
  });
}

/* ── Settings: Platform ─────────────────────────────────────────────── */

export interface PlatformSettings {
  platformName: string;
  defaultCurrency: string;
  timezone: string;
}

export function getPlatformSettings(signal?: AbortSignal): Promise<PlatformSettings> {
  return fetcher<PlatformSettings>(API_ROUTES.SETTINGS.PLATFORM, { signal });
}

export function updatePlatformSettings(payload: PlatformSettings): Promise<PlatformSettings> {
  return fetcher<PlatformSettings>(API_ROUTES.SETTINGS.PLATFORM, { method: "PUT", body: payload });
}

/* ── Settings: Pricing Plans ─────────────────────────────────────────── */

export interface PricingPlan {
  id: number | string;
  name: string;
  monthlyPrice: number;
  maxClients: number;
  maxAssets: number;
  features: string[];
}

export function getPricingPlans(signal?: AbortSignal): Promise<PricingPlan[]> {
  return fetcher<PricingPlan[]>(API_ROUTES.SETTINGS.PRICING, { signal });
}

export function createPricingPlan(payload: Omit<PricingPlan, "id">): Promise<PricingPlan> {
  return fetcher<PricingPlan>(API_ROUTES.SETTINGS.PRICING, { method: "POST", body: payload });
}

export function updatePricingPlan(id: PricingPlan["id"], payload: Partial<Omit<PricingPlan, "id">>): Promise<PricingPlan> {
  return fetcher<PricingPlan>(API_ROUTES.SETTINGS.PRICING_BY_ID(id), { method: "PUT", body: payload });
}

export function deletePricingPlan(id: PricingPlan["id"]): Promise<void> {
  return fetcher<void>(API_ROUTES.SETTINGS.PRICING_BY_ID(id), { method: "DELETE" });
}

/* ── Settings: Allocation Rules ─────────────────────────────────────── */

export interface AllocationProfile {
  stocksPercent: number;
  mutualFundsPercent: number;
  realEstatePercent: number;
}

export interface AllocationRules {
  LOW: AllocationProfile;
  MEDIUM: AllocationProfile;
  HIGH: AllocationProfile;
}

export function getAllocationRules(signal?: AbortSignal): Promise<AllocationRules> {
  return fetcher<AllocationRules>(API_ROUTES.SETTINGS.ALLOCATION, { signal });
}

export function updateAllocationRules(payload: AllocationRules): Promise<AllocationRules> {
  return fetcher<AllocationRules>(API_ROUTES.SETTINGS.ALLOCATION, { method: "PUT", body: payload });
}

/* ── Settings: Stock Config ──────────────────────────────────────────── */

export interface StockConfig {
  dataProvider: string;
  defaultExchange: string;
  autoSymbolSuffix: boolean;
  currencyMode: string;
  exchangeRateSource: string;
  manualRate: number;
}

export function getStockConfig(signal?: AbortSignal): Promise<StockConfig> {
  return fetcher<StockConfig>(API_ROUTES.SETTINGS.STOCK, { signal });
}

export function updateStockConfig(payload: StockConfig): Promise<StockConfig> {
  return fetcher<StockConfig>(API_ROUTES.SETTINGS.STOCK, { method: "PUT", body: payload });
}

/* ── Settings: Featured Properties ──────────────────────────────────── */

export interface FeaturedProperty {
  id: number | string;
  title: string;
  location: string;
  price: number;
  roi: number;
  imageUrl: string;
  redirectUrl: string;
  isActive: boolean;
  displayOrder: number;
}

export function getFeaturedProperties(signal?: AbortSignal): Promise<FeaturedProperty[]> {
  return fetcher<FeaturedProperty[]>(API_ROUTES.SETTINGS.FEATURED_PROPERTIES, { signal });
}

export function createFeaturedProperty(payload: Omit<FeaturedProperty, "id">): Promise<FeaturedProperty> {
  return fetcher<FeaturedProperty>(API_ROUTES.SETTINGS.FEATURED_PROPERTIES, { method: "POST", body: payload });
}

export function updateFeaturedProperty(id: FeaturedProperty["id"], payload: Partial<Omit<FeaturedProperty, "id">>): Promise<FeaturedProperty> {
  return fetcher<FeaturedProperty>(API_ROUTES.SETTINGS.FEATURED_PROPERTIES_BY_ID(id), { method: "PUT", body: payload });
}

export function deleteFeaturedProperty(id: FeaturedProperty["id"]): Promise<void> {
  return fetcher<void>(API_ROUTES.SETTINGS.FEATURED_PROPERTIES_BY_ID(id), { method: "DELETE" });
}

export function toggleFeaturedProperty(id: FeaturedProperty["id"]): Promise<FeaturedProperty> {
  return fetcher<FeaturedProperty>(API_ROUTES.SETTINGS.FEATURED_PROPERTIES_TOGGLE(id), { method: "PATCH" });
}

export function reorderFeaturedProperties(orderedIds: Array<FeaturedProperty["id"]>): Promise<void> {
  return fetcher<void>(API_ROUTES.SETTINGS.FEATURED_PROPERTIES_REORDER, { method: "PATCH", body: { orderedIds } });
}

/* ── Settings: Notifications ─────────────────────────────────────────── */

export interface NotificationSettings {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  rebalanceAlert: boolean;
  profitThreshold: number;
  lossThreshold: number;
}

export function getNotificationSettings(signal?: AbortSignal): Promise<NotificationSettings> {
  return fetcher<NotificationSettings>(API_ROUTES.SETTINGS.NOTIFICATIONS, { signal });
}

export function updateNotificationSettings(payload: NotificationSettings): Promise<NotificationSettings> {
  return fetcher<NotificationSettings>(API_ROUTES.SETTINGS.NOTIFICATIONS, { method: "PUT", body: payload });
}

/* ── Settings: Admin Users ───────────────────────────────────────────── */

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function getAdminUsers(signal?: AbortSignal): Promise<AdminUser[]> {
  return fetcher<AdminUser[]>(API_ROUTES.SETTINGS.ADMIN_USERS, { signal });
}

export function createAdminUser(payload: Omit<AdminUser, "id">): Promise<AdminUser> {
  return fetcher<AdminUser>(API_ROUTES.SETTINGS.ADMIN_USERS, { method: "POST", body: payload });
}

export function updateAdminUser(id: number, payload: Partial<Omit<AdminUser, "id">>): Promise<AdminUser> {
  return fetcher<AdminUser>(API_ROUTES.SETTINGS.ADMIN_USERS_BY_ID(id), { method: "PUT", body: payload });
}

export function deleteAdminUser(id: number): Promise<void> {
  return fetcher<void>(API_ROUTES.SETTINGS.ADMIN_USERS_BY_ID(id), { method: "DELETE" });
}

/* ── Image Upload ────────────────────────────────────────────────────── */

export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string }> {
  const token = getToken();

  const formData = new FormData();
  formData.append("file", file);

  const response = await new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/upload/image`);
    xhr.withCredentials = true;
    xhr.responseType = "text";
    xhr.setRequestHeader("Accept", "application/json");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.min(
          100,
          Math.max(0, Math.round((event.loaded / event.total) * 100))
        );
        onProgress(percent);
      };
    }

    xhr.onerror = () => reject(new NetworkError("Unable to reach backend API"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    xhr.onload = () => {
      const responseHeaders = new Headers();
      const contentType = xhr.getResponseHeader("Content-Type");
      if (contentType) {
        responseHeaders.set("Content-Type", contentType);
      }
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: responseHeaders,
        })
      );
    };

    xhr.send(formData);
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message =
        (typeof data?.detail === "string" ? data.detail : data?.detail?.[0]?.msg) ||
        data?.message ||
        message;
    } catch {}
    throw new ApiError(response.status, message);
  }

  const json = await response.json();
  if (onProgress) onProgress(100);
  if (json && typeof json === "object" && "data" in json) return json.data as { url: string };
  return json as { url: string };
}

/* ── Public Featured Properties (client dashboard) ───────────────────── */

export interface PublicFeaturedProperty {
  id: number | string;
  title: string;
  imageUrl: string;
  redirectUrl: string;
  location?: string;
  price?: number;
  roi?: number;
}

export function getPublicFeaturedProperties(signal?: AbortSignal): Promise<PublicFeaturedProperty[]> {
  return fetcher<PublicFeaturedProperty[]>(API_ROUTES.PROPERTIES.FEATURED, { signal });
}

/* ── Safe fetch utility ─────────────────────────────────────────────── */

/**
 * Wraps any list-fetching function with a try/catch so the UI never receives
 * an unhandled rejection or a non-array value.  Returns an empty array on any
 * failure (network error, API error, unexpected response shape, etc.).
 *
 * Use this for non-critical data fetches where showing an empty state is
 * preferable to crashing the component.
 *
 * @example
 * const results = await safeListFetch(() => searchStocks(query, signal));
 */
export async function safeListFetch<T>(
  fetchFn: () => Promise<T[]>,
  fallback: T[] = []
): Promise<T[]> {
  try {
    const data = await fetchFn();
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}
