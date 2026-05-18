export {
  API_BASE_URL,
  ApiError,
  NetworkError,
  fetcher,
  toErrorMessage,
} from "./fetcher";

import { fetcher } from "./fetcher";
import { resolveContractRequest } from "./api/contracts";
import { normalizeAssetType, normalizeInsights } from "./api/normalizers";

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
  isActive: boolean;
  is_active?: boolean;
  createdAt: string;
  created_at?: string;
}

// Type definition for AdminClient as requested
export type AdminClient = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
};

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  const request = resolveContractRequest("GET /clients");
  return fetcher<Client[]>(request.path, { signal, method: request.method });
}

/**
 * Fetch full client list for admin with normalized mapping.
 */
export async function fetchAdminClients(signal?: AbortSignal): Promise<AdminClient[]> {
  const request = resolveContractRequest("GET /clients/admin");
  const rawRes = await fetcher<any>(request.path, {
    signal,
    raw: true,
    cache: "no-store",
    method: request.method,
  });
  const res = unwrap<any>(rawRes);
  const list = extractArrayFromPayload(res);
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.info("[normalizer]", {
      stage: "admin-clients",
      rawPayloadSize: typeof rawRes === "object" && rawRes ? Object.keys(rawRes).length : 0,
      normalizedEntityCount: list.length,
      rejectedEntities: 0,
    });
  }
  return list.map((c: any) => ({
    id: c.id,
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? undefined,
    isActive: Boolean(c.is_active ?? c.isActive ?? true),
    is_active: Boolean(c.is_active ?? c.isActive ?? true),
    createdAt: c.created_at ?? c.createdAt,
    created_at: c.created_at ?? c.createdAt,
  }));
}

/* ── Stocks ────────────────────────────────────────────────────────── */

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

export function searchStocks(
  query: string,
  signal?: AbortSignal
): Promise<StockQuote[]> {
  return fetcher<StockQuote[]>(
    `/stocks/search?q=${encodeURIComponent(query)}`,
    { signal, noRedirectOn401: true }
  );
}

export function fetchStockQuote(
  symbol: string,
  signal?: AbortSignal
): Promise<StockQuote> {
  return fetcher<StockQuote>(`/stocks/v2/${encodeURIComponent(symbol)}`, {
    signal,
    noRedirectOn401: true,
  });
}

export function fetchBulkStockQuotes(
  symbols: string[],
  signal?: AbortSignal
): Promise<StockQuote[]> {
  return fetcher<StockQuote[]>("/stocks/v2/bulk", {
    method: "POST",
    body: { symbols },
    signal,
    noRedirectOn401: true,
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
  const request = userId
    ? resolveContractRequest("GET /transactions", {
        query: { client_id: userId },
      })
    : resolveContractRequest("GET /transactions");
  return fetcher<unknown>(request.path, { signal, method: request.method, raw: true }).then((raw) => {
    const list = extractArrayFromPayload(unwrap<unknown>(raw));
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.info("[normalizer]", {
        stage: "transactions",
        rawPayloadSize: typeof raw === "object" && raw ? Object.keys(raw as Record<string, unknown>).length : 0,
        normalizedEntityCount: list.length,
        rejectedEntities: 0,
      });
    }
    return list as Transaction[];
  });
}

/* ── Admin: Users ─────────────────────────────────────────────────── */

export interface User {
  id: number;
  name?: string;
  email: string;
  role: string;
  isActive: boolean;
  is_active?: boolean;
}

export function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  return fetcher<User[]>("/users", { signal });
}

/* ── Assets ─────────────────────────────────────────────────────────── */

export type AssetType = "stock" | "mf" | "property" | "commodity";

// Normalise asset type variants from the backend.
// The backend may send "real_estate" but the frontend uses "property" throughout.
/**
 * Centralized asset type mapping utility.
 */
export const MAP_ASSET_TYPE = (type: string | undefined | null): AssetType =>
  normalizeAssetType(type);

const normalizeType = (type: string | undefined): AssetType => {
  return MAP_ASSET_TYPE(type);
};

export interface Asset {
  id: number;
  type: AssetType;
  asset_type?: string;
  symbol?: string;
  name: string;
  quantity?: number;
  avgPrice: number;
  avg_price?: number;
  currentPrice?: number;
  current_price?: number;
  value: number;
  allocation: number;
  returnPercent?: number;
  return_percent?: number;
  /** Real estate */
  location?: string;
  purchasePrice?: number;
  purchase_price?: number;
  currentValue?: number;
  current_value?: number;
  rentAmount?: number;
  rent_amount?: number;
  rentDueDate?: string;
  rent_due_date?: string;
  tenantName?: string;
  tenant_name?: string;
  tenantPhone?: string;
  tenant_phone?: string;
  tenantEmail?: string;
  tenant_email?: string;
  /** Common */
  tags?: string[];
  userId?: number;
  user_id?: number;
  createdAt?: string;
  created_at?: string;
}

export type CreateAssetPayload = Omit<
  Asset,
  "id" | "value" | "allocation" | "createdAt"
>;
export type UpdateAssetPayload = Partial<CreateAssetPayload>;

export interface AssetsAllocation {
  stock: number;
  mf: number;
  real_estate: number;
}

export interface PortfolioFull {
  positions: Asset[];
  totalValue: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  commodityValue: number;
  roiPercent: number;
}

/**
 * Safely unwrap the backend response envelope: { success, data, meta }
 * Handles potential double-nesting response?.data?.data
 */
function unwrap<T>(res: any): T {
  if (!res) return res;
  const visited = new Set<unknown>();
  let current: unknown = res;
  while (current && typeof current === "object" && !Array.isArray(current) && !visited.has(current)) {
    visited.add(current);
    const record = current as Record<string, unknown>;
    if (!("data" in record)) return current as T;
    current = record.data;
  }
  return current as T;
}

function extractArrayFromPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const directCandidates = [
    record.items,
    record.results,
    record.rows,
    record.records,
    record.clients,
    record.assets,
    record.transactions,
    record.holdings,
    record.entries,
    record.list,
  ];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  if (record.data && typeof record.data === "object") {
    const nested = extractArrayFromPayload(record.data);
    if (nested.length > 0) return nested;
  }
  return [];
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeAssetRecord(a: any, userId?: number): Asset {
  const type = normalizeType(a?.asset_type ?? a?.type);
  const avgPrice = toFiniteNumber(a?.avg_price ?? a?.avgPrice ?? 0, 0);
  const currentPrice = toFiniteNumber(a?.current_price ?? a?.currentPrice ?? 0, 0);
  const purchasePrice = toFiniteNumber(a?.purchase_price ?? a?.purchasePrice ?? 0, 0);
  const currentValue = toFiniteNumber(a?.current_value ?? a?.currentValue ?? 0, 0);
  const rentAmount = toFiniteNumber(a?.rent_amount ?? a?.rentAmount ?? 0, 0);
  const normalizedUserId =
    userId ??
    (toFiniteNumber(a?.user_id ?? a?.userId ?? a?.client_id ?? a?.clientId, 0) || undefined);
  const quantity = toFiniteNumber(a?.quantity ?? 0, 0);
  const value = toFiniteNumber(a?.value ?? 0, 0);
  const invested = quantity * avgPrice;
  const returnPercent = invested > 0 ? ((value - invested) / invested) * 100 : 0;
  const normalizedId = toFiniteNumber(a?.id ?? a?.asset_id ?? a?.assetId, 0);

  return {
    ...a,
    id: normalizedId,
    type,
    asset_type: type,
    name: String(a?.name ?? a?.symbol ?? "Unnamed asset").trim() || "Unnamed asset",
    symbol: typeof a?.symbol === "string" ? a.symbol : undefined,
    quantity,
    avgPrice,
    avg_price: avgPrice,
    currentPrice,
    current_price: currentPrice,
    value,
    allocation: toFiniteNumber(a?.allocation ?? 0, 0),
    returnPercent,
    return_percent: returnPercent,
    purchasePrice,
    purchase_price: purchasePrice,
    currentValue,
    current_value: currentValue,
    rentAmount,
    rent_amount: rentAmount,
    rentDueDate: a?.rent_due_date ?? a?.rentDueDate,
    rent_due_date: a?.rent_due_date ?? a?.rentDueDate,
    tenantName: a?.tenant_name ?? a?.tenantName,
    tenant_name: a?.tenant_name ?? a?.tenantName,
    tenantPhone: a?.tenant_phone ?? a?.tenantPhone,
    tenant_phone: a?.tenant_phone ?? a?.tenantPhone,
    tenantEmail: a?.tenant_email ?? a?.tenantEmail,
    tenant_email: a?.tenant_email ?? a?.tenantEmail,
    tags: normalizeTags(a?.tags),
    userId: normalizedUserId,
    user_id: normalizedUserId,
    createdAt: a?.created_at ?? a?.createdAt,
    created_at: a?.created_at ?? a?.createdAt,
  };
}

function summarizePortfolio(positions: Asset[]): PortfolioFull {
  const stockValue = positions
    .filter((asset) => normalizeType(asset.asset_type ?? asset.type) === "stock")
    .reduce((sum, asset) => sum + toFiniteNumber(asset.value, 0), 0);
  const mfValue = positions
    .filter((asset) => normalizeType(asset.asset_type ?? asset.type) === "mf")
    .reduce((sum, asset) => sum + toFiniteNumber(asset.value, 0), 0);
  const propertyValue = positions
    .filter((asset) => normalizeType(asset.asset_type ?? asset.type) === "property")
    .reduce((sum, asset) => sum + toFiniteNumber(asset.value, 0), 0);
  const commodityValue = positions
    .filter((asset) => normalizeType(asset.asset_type ?? asset.type) === "commodity")
    .reduce((sum, asset) => sum + toFiniteNumber(asset.value, 0), 0);
  const totalValue = stockValue + mfValue + propertyValue + commodityValue;

  return {
    positions,
    totalValue,
    stockValue,
    mfValue,
    propertyValue,
    commodityValue,
    roiPercent: 0,
  };
}

export interface DashboardSummary {
  totalValue: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  commodityValue: number;
  roiPercent: number;
}

export interface DashboardAllocation {
  equity: number;
  property: number;
  mutualFunds: number;
  commodity: number;
}

/**
 * Full dashboard response shape returned by /assets/me
 * Backend is the source of truth for all calculations.
 */
export interface DashboardData {
  assets: Asset[];
  summary: DashboardSummary;
  allocation: DashboardAllocation;
}

/**
 * Fetch all dashboard data (assets, summary, allocation) from the live assets endpoint.
 * Maps backend snake_case to frontend camelCase.
 */
export async function fetchDashboardData(signal?: AbortSignal): Promise<DashboardData> {
  const rawRes = await fetcher<any>("/assets/me", { signal, raw: true, cache: "no-store" });
  const res = unwrap<any>(rawRes);

  const rawAssets = Array.isArray(res?.assets) ? res.assets : (Array.isArray(res) ? res : []);
  
  const assets: Asset[] = rawAssets.map((a: any) => normalizeAssetRecord(a));

  const summary: DashboardSummary = {
    totalValue: Number(res?.summary?.total_value ?? 0),
    stockValue: Number(res?.summary?.stock_value ?? 0),
    mfValue: Number(res?.summary?.mf_value ?? 0),
    propertyValue: Number(res?.summary?.property_value ?? 0),
    commodityValue: Number(res?.summary?.commodity_value ?? 0),
    roiPercent: Number(res?.summary?.roi_percent ?? 0),
  };

  const allocation: DashboardAllocation = {
    equity: Number(res?.allocation?.equity ?? 0),
    property: Number(res?.allocation?.property ?? res?.allocation?.real_estate ?? 0),
    mutualFunds: Number(res?.allocation?.mutual_funds ?? 0),
    commodity: Number(res?.allocation?.commodity ?? 0),
  };

  return {
    assets,
    summary,
    allocation,
  };
}

/**
 * Fetch all portfolio items grouped by user ID for the admin panel.
 */
export async function fetchAdminGroupedAssets(
  signal?: AbortSignal
): Promise<Record<number, Asset[]>> {
  const request = resolveContractRequest("GET /assets/admin");
  const rawRes = await fetcher<any>(request.path, {
    signal,
    raw: true,
    cache: "no-store",
    method: request.method,
  });
  const res = unwrap<any>(rawRes);

  const grouped: Record<number, Asset[]> = {};

  const appendAsset = (rawAsset: unknown, fallbackUserId?: number) => {
    if (!rawAsset || typeof rawAsset !== "object") return;
    const entry = rawAsset as Record<string, unknown>;
    const candidateIds = Array.from(
      new Set(
        [
          entry.client_id,
          entry.clientId,
          entry.user_id,
          entry.userId,
          fallbackUserId,
        ]
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );
    if (candidateIds.length === 0) return;

    const normalized = normalizeAssetRecord(entry, candidateIds[0]);
    for (const candidateId of candidateIds) {
      if (!grouped[candidateId]) grouped[candidateId] = [];
      grouped[candidateId].push({ ...normalized });
    }
  };

  const rootAssets = extractArrayFromPayload(res);
  if (rootAssets.length > 0) {
    for (const rawAsset of rootAssets) appendAsset(rawAsset);
  }

  if (res && typeof res === "object" && !Array.isArray(res)) {
    for (const [key, value] of Object.entries(res as Record<string, unknown>)) {
      const userId = Number(key);
      if (Array.isArray(value) && Number.isFinite(userId)) {
        for (const rawAsset of value) appendAsset(rawAsset, userId);
        continue;
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        const nestedAssets = extractArrayFromPayload(nested);
        if (nestedAssets.length > 0) {
          for (const rawAsset of nestedAssets) appendAsset(rawAsset, userId);
        }
      }
    }
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    const normalizedEntityCount = Object.values(grouped).reduce((sum, assets) => sum + assets.length, 0);
    console.info("[normalizer]", {
      stage: "admin-grouped-assets",
      rawPayloadSize: typeof rawRes === "object" && rawRes ? Object.keys(rawRes).length : 0,
      normalizedEntityCount,
      rejectedEntities: 0,
      clientBuckets: Object.keys(grouped).length,
    });
  }

  return grouped;
}

export async function fetchAssets(
  userId?: number,
  signal?: AbortSignal
): Promise<Asset[]> {
  if (userId === undefined) {
    const dashboard = await fetchDashboardData(signal);
    return dashboard.assets;
  }

  const grouped = await fetchAdminGroupedAssets(signal);
  return grouped[userId] ?? [];
}

export async function fetchPortfolio(
  userId?: number,
  signal?: AbortSignal
): Promise<PortfolioFull> {
  if (userId === undefined) {
    const dashboard = await fetchDashboardData(signal);
    return {
      positions: dashboard.assets,
      totalValue: dashboard.summary.totalValue,
      stockValue: dashboard.summary.stockValue,
      mfValue: dashboard.summary.mfValue,
      propertyValue: dashboard.summary.propertyValue,
      commodityValue: dashboard.summary.commodityValue,
      roiPercent: dashboard.summary.roiPercent,
    };
  }

  const assets = await fetchAssets(userId, signal);
  return summarizePortfolio(assets);
}

export function createAsset(
  payload: CreateAssetPayload,
  signal?: AbortSignal
): Promise<Asset> {
  return fetcher<Asset>("/assets", {
    method: "POST",
    body: payload,
    signal,
  });
}

export function updateAsset(
  id: number,
  payload: UpdateAssetPayload,
  signal?: AbortSignal
): Promise<Asset> {
  return fetcher<Asset>(`/assets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
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
  propertyPercentage: number;
  equity_percentage?: number;
  property_percentage?: number;
  real_estate_percentage?: number;
  /** Backend may return plain strings or structured InsightItem objects */
  alerts: (string | InsightItem)[];
}

export async function fetchInsights(
  clientId?: number,
  signal?: AbortSignal
): Promise<InsightsResponse> {
  const request = clientId !== undefined
    ? resolveContractRequest("GET /insights", { query: { client_id: clientId } })
    : resolveContractRequest("GET /insights/me");

  const rawRes = await fetcher<any>(request.path, {
    signal,
    raw: true,
    cache: "no-store",
    method: request.method,
  });
  const res = unwrap<any>(rawRes);
  const normalized = normalizeInsights(res) ?? { equityPercentage: 0, propertyPercentage: 0, alerts: [] };
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.info("[normalizer]", {
      stage: "insights-fetch",
      clientId: clientId ?? null,
      rawPayloadSize: typeof rawRes === "object" && rawRes ? Object.keys(rawRes).length : 0,
      normalizedEntityCount: normalized.alerts.length,
      rejectedEntities: 0,
    });
  }
  return normalized;
}

/* ── Mutual Funds ───────────────────────────────────────────────────── */

export interface MutualFundResult {
  code: string;
  name: string;
  nav: number;
  category?: string;
  fundHouse?: string;
  fund_house?: string;
}

export function searchMutualFunds(
  query: string,
  signal?: AbortSignal
): Promise<MutualFundResult[]> {
  return fetcher<MutualFundResult[]>(
    `/mutual-funds/search?q=${encodeURIComponent(query)}`,
    { signal, noRedirectOn401: true }
  );
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
