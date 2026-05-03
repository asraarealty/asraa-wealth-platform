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
  createdAt?: string;
};

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  return fetcher<Client[]>("/clients", { signal });
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

export type AssetType = "stock" | "mf" | "property";

// Normalise asset type variants from the backend.
// The backend may send "real_estate" but the frontend uses "property" throughout.
const KNOWN_ASSET_TYPES = new Set<string>(["stock", "mf", "property"]);

const normalizeType = (type: string | undefined): AssetType => {
  if (type === "real_estate") return "property";
  if (type && KNOWN_ASSET_TYPES.has(type)) return type as AssetType;
  return "stock";
};

/** Normalise a raw API response into a typed Asset array. */
const normalizeAssetList = (res: unknown): Asset[] => {
  const list: unknown = Array.isArray(res)
    ? res
    : (res as any)?.data ?? (res as any)?.assets ?? (res as any)?.positions ?? [];

  if (!Array.isArray(list)) {
    return [];
  }

  return (list as any[]).map((a: any) => ({
    ...a,
    avgPrice: Number(a.avgPrice ?? a.avg_price ?? 0),
    currentPrice: Number(a.currentPrice ?? a.current_price ?? 0),
    type: normalizeType(a.type ?? a.asset_type),
  }));
};

export interface Asset {
  id: number;
  type: "stock" | "mf" | "property";
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
 * Full portfolio response shape returned by /portfolio/me or /portfolio?user_id=...
 * Includes aggregate totals from the backend so the UI does not need to recompute them.
 */
export interface PortfolioFull {
  positions: Asset[];
  totalValue: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  roiPercent: number;
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
      ? `/portfolio?user_id=${encodeURIComponent(userId)}`
      : "/portfolio/me";

  let res: any;
  try {
    res = await fetcher<any>(path, { signal, raw: true, cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return {
        positions: [],
        totalValue: 0,
        stockValue: 0,
        mfValue: 0,
        propertyValue: 0,
        roiPercent: 0,
      };
    }
    throw err;
  }

  const rawPositions: unknown = Array.isArray(res)
    ? res
    : res?.positions ?? res?.data ?? res?.assets ?? [];

  const positions = normalizeAssetList(rawPositions);

  // Prefer server-provided totals; fall back to client-side computation when omitted.
  const totalVal =
    typeof res?.total_value === "number"
      ? res.total_value
      : positions.reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const totalInvested = positions.reduce(
    (s: number, p: Asset) => s + Number(p.quantity ?? 0) * Number(p.avgPrice ?? 0),
    0
  );

  const stockVal =
    typeof res?.stock_value === "number"
      ? res.stock_value
      : positions
          .filter((p: Asset) => p.type === "stock")
          .reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const mfVal =
    typeof res?.mf_value === "number"
      ? res.mf_value
      : positions
          .filter((p: Asset) => p.type === "mf")
          .reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const propertyVal =
    typeof res?.property_value === "number"
      ? res.property_value
      : positions
          .filter((p: Asset) => p.type === "property")
          .reduce((s: number, p: Asset) => s + Number(p.value ?? 0), 0);

  const roiVal =
    typeof res?.roi_percent === "number"
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
    roiPercent: Number(roiVal ?? 0),
  };
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
