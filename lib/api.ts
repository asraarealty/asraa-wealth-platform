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
  buildStockPayload,
} from "./payloads/assets";
import { safeDecimalNumber } from "./utils/numberParsing";
import { normalizeAssetPayload, normalizeClientPayload, type ClientStatus } from "./api/normalizers";

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
  return fetcher<LoginResponse>("/auth/login", {
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
  return fetcher<MeResponse>("/auth/me");
}

export function logout(): Promise<void> {
  return fetcher<void>("/auth/logout", { method: "POST" });
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
  // Normalise approval_status from all known backend field shapes
  const approvalStatus: AdminClient["approvalStatus"] =
    raw.approval_status ??
    (raw.is_approved === true || raw.approved === true ? "approved" : undefined);

  const normalized = normalizeClientPayload(raw) as Record<string, unknown>;
  const status = (normalized.status as ClientStatus | undefined) ?? "inactive";

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    createdAt: raw.createdAt ?? raw.created_at,
    status,
    isActive: status === "active",
    approvalStatus,
  };
}

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  return fetcher<any[]>("/clients", { signal }).then((rows) =>
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
  const data = await fetcher<any[]>("/clients", { signal });
  return Array.isArray(data) ? data.map(mapAdminClient) : [];
}

export function toggleClientStatus(
  id: number,
  isActive: boolean
): Promise<unknown> {
  return fetcher(`/clients/${id}/status`, {
    method: "PATCH",
    body: { status: isActive ? "active" : "inactive" },
  });
}

export function deleteClient(
  id: number,
  signal?: AbortSignal
): Promise<void> {
  return fetcher<void>(`/clients/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });
}

export function updateClient(
  id: number,
  data: Record<string, unknown>
): Promise<unknown> {
  return fetcher<unknown>(`/clients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data,
  });
}

export function approveClient(id: number): Promise<void> {
  return fetcher<void>(`/clients/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
  });
}

export function restoreClient(id: number): Promise<void> {
  return fetcher<void>(`/clients/${encodeURIComponent(id)}/restore`, {
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
export const stockEndpoints = {
  quote: (symbol: string) => `/stocks/${encodeURIComponent(symbol)}`,
  search: (q: string) => `/stocks/search?q=${encodeURIComponent(q)}`,
  bulk: `/stocks/bulk`,
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
  return fetcher<RecommendedStock>("/stocks/recommended", {
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
  const qs = userId
    ? `?client_id=${encodeURIComponent(userId)}`
    : "";

  return fetcher<Transaction[]>(`/transactions${qs}`, { signal });
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
  return fetcher<User[]>("/users", { signal });
}

/* ── Assets ─────────────────────────────────────────────────────────── */

export type AssetType = "stock" | "mf" | "property" | "commodity";

// Normalise asset type variants from the backend.
// The backend may send "real_estate" but the frontend uses "property" throughout.
const KNOWN_ASSET_TYPES = new Set<string>(["stock", "mf", "property", "commodity"]);

const normalizeType = (type: string | undefined): AssetType => {
  if (type === "real_estate") return "property";
  // Backend may persist mutual funds as "mutual_fund"; UI tabs use "mf".
  if (type === "mutual_fund") return "mf";
  if (type && KNOWN_ASSET_TYPES.has(type)) return type as AssetType;
  return "stock";
};

const hasCommodityTag = (tags: unknown): boolean => {
  if (!Array.isArray(tags)) return false;
  return tags.some((tag) => String(tag).trim().toLowerCase() === "commodity");
};

/** Normalise a raw API response into a typed Asset array. */
const normalizeAssetList = (res: unknown): Asset[] => {
  const list: unknown = Array.isArray(res)
    ? res
    : (res as any)?.data ?? (res as any)?.assets ?? (res as any)?.positions ?? [];

  if (!Array.isArray(list)) {
    return [];
  }

  return (list as any[]).map((a: any) => {
    const normalizedType = normalizeType(a.type ?? a.asset_type);
    const type = normalizedType === "stock" && hasCommodityTag(a.tags) ? "commodity" : normalizedType;
    return {
      ...a,
      avgPrice: Number(a.avgPrice ?? a.avg_price ?? 0),
      currentPrice: Number(a.currentPrice ?? a.current_price ?? 0),
      type,
      exchange: a.exchange ?? undefined,
      currency: a.currency ?? undefined,
      priceUSD: a.priceUSD ?? a.price_usd ?? undefined,
      priceINR: a.priceINR ?? a.price_inr ?? undefined,
      // Real estate camelCase normalization (backend may return snake_case)
      purchasePrice: a.purchasePrice,
      currentValue: a.currentValue,
      rentAmount: a.rentAmount,
      rentDueDate: a.rentDueDate,
      tenantName: a.tenantName,
      tenantPhone: a.tenantPhone,
      tenantEmail: a.tenantEmail,
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
      ? `/assets?user_id=${encodeURIComponent(userId)}`
      : "/assets/me";

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
      const res = await fetcher<any>(`/assets?user_id=${encodeURIComponent(uid)}`, {
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
    purchase_value: p.purchase_value ?? p.purchasePrice,
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

/**
 * Build the canonical backend payload for supported asset creation flows.
 *
 * Returns `null` for asset types that still use generic camelCase→snake_case
 * translation (currently real-estate/property), so createAsset can fall back
 * to `toApiPayload` for those payloads.
 */
function buildCanonicalAssetPayload(
  payload: CreateAssetPayload,
  quantity: number,
  avgPrice: number,
  currentPrice: number
): Record<string, unknown> | null {
  const targetClientId = Number(payload.clientId ?? payload.userId);

  if (payload.type === "stock") {
    if (!Number.isFinite(targetClientId) || targetClientId <= 0) {
      throw new Error("Client is required");
    }
    return {
      ...buildStockPayload({
      clientId: targetClientId,
      symbol: payload.symbol ?? "",
      name: payload.name,
      exchange: payload.exchange,
      quantity,
      avgPrice,
      currentPrice,
      tags: payload.tags,
      }),
    };
  }

  if (payload.type === "mf") {
    if (!Number.isFinite(targetClientId) || targetClientId <= 0) {
      throw new Error("Client is required");
    }
    return {
      ...buildFundPayload({
        clientId: targetClientId,
        assetType: "mutual_fund",
        fundCode: payload.symbol,
        fundName: payload.name,
        quantity,
        avgNav: avgPrice,
        currentNav: currentPrice,
      }),
    };
  }

  if (payload.type === "commodity") {
    if (!Number.isFinite(targetClientId) || targetClientId <= 0) {
      throw new Error("Client is required");
    }
    return {
      ...buildCommodityPayload({
      clientId: targetClientId,
      symbol: payload.symbol ?? "",
      name: payload.name,
      exchange: payload.exchange,
      quantity,
      avgPrice,
      currentPrice,
      }),
    };
  }

  return null;
}

export function createAsset(
  payload: CreateAssetPayload,
  signal?: AbortSignal
): Promise<Asset> {
  const targetClientId = safeDecimalNumber(payload.clientId ?? payload.userId, 0);
  const quantity = safeDecimalNumber(payload.quantity, 0);
  const avgPrice = safeDecimalNumber(payload.avgPrice, 0);
  const currentPrice = safeDecimalNumber(payload.currentPrice ?? payload.avgPrice, 0);

  const normalizedPayload: CreateAssetPayload = {
    ...payload,
    clientId: targetClientId,
    userId: undefined,
    symbol:
      payload.type === "property"
        ? payload.symbol?.trim() || undefined
        : payload.symbol?.trim().toUpperCase() || undefined,
    name: String(payload.name ?? "").trim(),
    exchange: payload.exchange?.trim().toUpperCase() || undefined,
    quantity,
    avgPrice,
    currentPrice,
  };

  const validationErrors: Record<string, string> = {};

  if (targetClientId <= 0) validationErrors.clientId = "Client is required";
  if (!normalizedPayload.name) validationErrors.name = "Name is required";
  if ((payload.type === "stock" || payload.type === "commodity") && !normalizedPayload.symbol) {
    validationErrors.symbol = "Symbol is required";
  }
  if (payload.type === "mf" && !normalizedPayload.symbol) {
    validationErrors.symbol = "Mutual fund code is required";
  }
  if (quantity <= 0) validationErrors.quantity = "Quantity must be greater than 0";
  if (avgPrice <= 0) validationErrors.avgPrice = "Average price must be greater than 0";
  if (currentPrice <= 0) validationErrors.currentPrice = "Current price must be greater than 0";

  if (Object.keys(validationErrors).length > 0) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[createAsset] validation_failed", {
        rawFormState: redactForAssetDebug(payload as Record<string, unknown>),
        normalizedPayload: redactForAssetDebug(normalizedPayload as Record<string, unknown>),
        validationResult: { valid: false, rejectedField: Object.keys(validationErrors)[0] },
        errors: validationErrors,
      });
    }
    throw new Error(validationErrors[Object.keys(validationErrors)[0]]);
  }

  const canonicalPayload = buildCanonicalAssetPayload(
    normalizedPayload,
    quantity,
    avgPrice,
    currentPrice
  );
  const requestPayload = sanitizeOutgoingPayload(
    canonicalPayload ?? toApiPayload(normalizedPayload)
  );

  if (process.env.NODE_ENV === "development") {
    console.debug("[createAsset] submit", {
      rawFormState: redactForAssetDebug(payload as Record<string, unknown>),
      normalizedPayload: redactForAssetDebug(normalizedPayload as Record<string, unknown>),
      validationResult: { valid: true, rejectedField: null },
      requestPayload: redactForAssetDebug(requestPayload),
    });
  }

  return fetcher<Asset>("/assets", {
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
  return fetcher<Asset>(`/assets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: toApiPayload(payload),
    signal,
  });
}

export function deleteAsset(
  id: number,
  signal?: AbortSignal
): Promise<void> {
  return fetcher<void>(`/assets/${encodeURIComponent(id)}`, {
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
      ? `/insights?user_id=${encodeURIComponent(clientId)}`
      : "/insights/me";

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
  return fetcher<any>(`/commodities/search?q=${encodeURIComponent(query)}`, {
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
    `/mutual-funds/search?q=${encodeURIComponent(query)}`,
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
  return fetcher<void>("/auth/register", {
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
  return fetcher<void>("/auth/forgot-password", {
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
  return fetcher<void>("/auth/reset-password", {
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
  return fetcher<PlatformSettings>("/settings/platform", { signal });
}

export function updatePlatformSettings(payload: PlatformSettings): Promise<PlatformSettings> {
  return fetcher<PlatformSettings>("/settings/platform", { method: "PUT", body: payload });
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
  return fetcher<PricingPlan[]>("/settings/pricing", { signal });
}

export function createPricingPlan(payload: Omit<PricingPlan, "id">): Promise<PricingPlan> {
  return fetcher<PricingPlan>("/settings/pricing", { method: "POST", body: payload });
}

export function updatePricingPlan(id: PricingPlan["id"], payload: Partial<Omit<PricingPlan, "id">>): Promise<PricingPlan> {
  return fetcher<PricingPlan>(`/settings/pricing/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
}

export function deletePricingPlan(id: PricingPlan["id"]): Promise<void> {
  return fetcher<void>(`/settings/pricing/${encodeURIComponent(id)}`, { method: "DELETE" });
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
  return fetcher<AllocationRules>("/settings/allocation", { signal });
}

export function updateAllocationRules(payload: AllocationRules): Promise<AllocationRules> {
  return fetcher<AllocationRules>("/settings/allocation", { method: "PUT", body: payload });
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
  return fetcher<StockConfig>("/settings/stock", { signal });
}

export function updateStockConfig(payload: StockConfig): Promise<StockConfig> {
  return fetcher<StockConfig>("/settings/stock", { method: "PUT", body: payload });
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
  return fetcher<FeaturedProperty[]>("/settings/featured-properties", { signal });
}

export function createFeaturedProperty(payload: Omit<FeaturedProperty, "id">): Promise<FeaturedProperty> {
  return fetcher<FeaturedProperty>("/settings/featured-properties", { method: "POST", body: payload });
}

export function updateFeaturedProperty(id: FeaturedProperty["id"], payload: Partial<Omit<FeaturedProperty, "id">>): Promise<FeaturedProperty> {
  return fetcher<FeaturedProperty>(`/settings/featured-properties/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
}

export function deleteFeaturedProperty(id: FeaturedProperty["id"]): Promise<void> {
  return fetcher<void>(`/settings/featured-properties/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function toggleFeaturedProperty(id: FeaturedProperty["id"]): Promise<FeaturedProperty> {
  return fetcher<FeaturedProperty>(`/settings/featured-properties/${encodeURIComponent(id)}/toggle`, { method: "PATCH" });
}

export function reorderFeaturedProperties(orderedIds: Array<FeaturedProperty["id"]>): Promise<void> {
  return fetcher<void>("/settings/featured-properties/reorder", { method: "PATCH", body: { orderedIds } });
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
  return fetcher<NotificationSettings>("/settings/notifications", { signal });
}

export function updateNotificationSettings(payload: NotificationSettings): Promise<NotificationSettings> {
  return fetcher<NotificationSettings>("/settings/notifications", { method: "PUT", body: payload });
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
  return fetcher<AdminUser[]>("/settings/admin-users", { signal });
}

export function createAdminUser(payload: Omit<AdminUser, "id">): Promise<AdminUser> {
  return fetcher<AdminUser>("/settings/admin-users", { method: "POST", body: payload });
}

export function updateAdminUser(id: number, payload: Partial<Omit<AdminUser, "id">>): Promise<AdminUser> {
  return fetcher<AdminUser>(`/settings/admin-users/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
}

export function deleteAdminUser(id: number): Promise<void> {
  return fetcher<void>(`/settings/admin-users/${encodeURIComponent(id)}`, { method: "DELETE" });
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
  return fetcher<PublicFeaturedProperty[]>("/properties/featured", { signal });
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
