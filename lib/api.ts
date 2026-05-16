export {
  API_BASE_URL,
  ApiError,
  NetworkError,
  fetcher,
  toErrorMessage,
} from "./fetcher";

import { fetcher, ApiError } from "./fetcher";

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
  createdAt: string;
}

// Type definition for AdminClient as requested
export type AdminClient = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
};

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  return fetcher<Client[]>("/clients", { signal });
}

/**
 * Fetch full client list for admin with normalized mapping.
 */
export async function fetchAdminClients(signal?: AbortSignal): Promise<AdminClient[]> {
  const rawRes = await fetcher<any>("/clients/admin", { signal, raw: true, cache: "no-store" });
  const res = unwrap<any>(rawRes);
  const list = Array.isArray(res) ? res : [];
  return list.map((c: any) => ({
    id: c.id,
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? undefined,
    isActive: Boolean(c.is_active ?? c.isActive ?? true),
    createdAt: c.created_at ?? c.createdAt,
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
  return fetcher<StockQuote>(`/stocks/${encodeURIComponent(symbol)}`, {
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

/**
 * Centralized asset type mapping utility.
 */
export const MAP_ASSET_TYPE = (type: string | undefined | null): AssetType => {
  if (!type) return "stock";
  const normalized = type.toLowerCase();
  if (normalized === "real_estate" || normalized === "real-estate") return "property";
  if (normalized === "mutual_fund" || normalized === "mutual-fund") return "mf";
  if (KNOWN_ASSET_TYPES.has(normalized)) return normalized as AssetType;
  return "stock";
};

const normalizeType = (type: string | undefined): AssetType => {
  return MAP_ASSET_TYPE(type);
};

export interface Asset {
  id: number;
  type: AssetType;
  symbol?: string;
  name: string;
  quantity?: number;
  avgPrice: number;
  currentPrice?: number;
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
  createdAt?: string;
}

export type CreateAssetPayload = Omit<
  Asset,
  "id" | "value" | "allocation" | "createdAt"
>;
export type UpdateAssetPayload = Partial<CreateAssetPayload>;

/**
 * Safely unwrap the backend response envelope: { success, data, meta }
 * Handles potential double-nesting response?.data?.data
 */
function unwrap<T>(res: any): T {
  if (!res) return res;
  // Check for response.data.data per requirements
  if (res.data && typeof res.data === 'object' && 'data' in res.data) {
    return res.data.data as T;
  }
  return (res.data ?? res) as T;
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
  return {
    ...a,
    id: toFiniteNumber(a?.id, 0),
    type: normalizeType(a?.asset_type ?? a?.type),
    name: String(a?.name ?? a?.symbol ?? "Unnamed asset").trim() || "Unnamed asset",
    symbol: typeof a?.symbol === "string" ? a.symbol : undefined,
    quantity: toFiniteNumber(a?.quantity ?? 0, 0),
    avgPrice: toFiniteNumber(a?.avg_price ?? a?.avgPrice ?? 0, 0),
    currentPrice: toFiniteNumber(a?.current_price ?? a?.currentPrice ?? 0, 0),
    value: toFiniteNumber(a?.value ?? 0, 0),
    allocation: toFiniteNumber(a?.allocation ?? 0, 0),
    tags: normalizeTags(a?.tags),
    userId: userId ?? (toFiniteNumber(a?.user_id ?? a?.userId, 0) || undefined),
  };
}

export interface DashboardSummary {
  totalValue: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  roiPercent: number;
}

export interface DashboardAllocation {
  equity: number;
  property: number;
  mutualFunds: number;
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
    roiPercent: Number(res?.summary?.roi_percent ?? 0),
  };

  const allocation: DashboardAllocation = {
    equity: Number(res?.allocation?.equity ?? 0),
    property: Number(res?.allocation?.property ?? res?.allocation?.real_estate ?? 0),
    mutualFunds: Number(res?.allocation?.mutual_funds ?? 0),
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
  const rawRes = await fetcher<any>("/assets/admin", { signal, raw: true, cache: "no-store" });
  const res = unwrap<any>(rawRes);
  
  const grouped: Record<number, Asset[]> = {};
  for (const [userId, rawAssets] of Object.entries(res ?? {})) {
    if (!Array.isArray(rawAssets)) continue;
      grouped[Number(userId)] = rawAssets.map((a: any) =>
        normalizeAssetRecord(a, Number(userId))
      );
  }
  return grouped;
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

  const rawRes = await fetcher<any>(path, { signal, raw: true, cache: "no-store" });
  const res = unwrap<any>(rawRes);

  if (res && typeof res === "object" && !Array.isArray(res)) {
    return {
      equityPercentage: Number(res.equity_percentage ?? 0),
      propertyPercentage: Number(res.property_percentage ?? res.real_estate_percentage ?? 0),
      alerts: Array.isArray(res.alerts) ? res.alerts : [],
    };
  }

  // Fallback: if backend returns an array of InsightItem objects
  if (Array.isArray(res)) {
    return { equityPercentage: 0, propertyPercentage: 0, alerts: [] };
  }

  return { equityPercentage: 0, propertyPercentage: 0, alerts: [] };
}

/* ── Mutual Funds ───────────────────────────────────────────────────── */

export interface MutualFundResult {
  code: string;
  name: string;
  nav: number;
  category?: string;
  fundHouse?: string;
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
