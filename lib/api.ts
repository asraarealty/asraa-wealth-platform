export {
  API_BASE_URL,
  ApiError,
  NetworkError,
  fetcher,
  toErrorMessage,
} from "./fetcher";

import { fetcher } from "./fetcher";

/* ── Auth ───────────────────────────────────────────────────────────── */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  refresh_token?: string;
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
  is_active: boolean;
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
  is_active: boolean;
  created_at: string;
}

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  return fetcher<Client[]>("/clients", { signal });
}

/* ── Stocks ────────────────────────────────────────────────────────── */

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap: number;
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

/* ── Portfolio ─────────────────────────────────────────────────────── */

export interface Portfolio {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  avg_price: number;
  value: number;
  allocation?: number;
}

export interface PortfolioMeta {
  total_value: number;
  stock_value: number;
  mf_value: number;
  property_value: number;
  roi_percent: number;
}

export interface PortfolioResult {
  items: Portfolio[];
  meta: Partial<PortfolioMeta>;
}

/**
 * ✅ FIXED VERSION
 * - Uses correct query param: user_id
 * - Matches backend route: /portfolio
 * - Prevents client from sending ID
 */
export async function fetchPortfolioItems(
  clientId?: number,
  signal?: AbortSignal
): Promise<PortfolioResult> {
  let path = "/portfolio";

  // ✅ Only admin should pass user_id
  if (clientId !== undefined) {
    path += `?user_id=${encodeURIComponent(clientId)}`;
  }

  const res = await fetcher<any>(path, { signal, raw: true });

  const data: unknown = Array.isArray(res)
    ? res
    : res?.data ?? res?.positions ?? [];

  const meta: Partial<PortfolioMeta> = res?.meta ?? {};

  if (!Array.isArray(data)) {
    console.error("Portfolio data invalid:", data);
    return { items: [], meta };
  }

  return { items: data as Portfolio[], meta };
}

/* ── Transactions ─────────────────────────────────────────────────── */

export interface Transaction {
  id: string;
  client_id: string;
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  date: string;
}

export function fetchTransactions(
  clientId?: string,
  signal?: AbortSignal
): Promise<Transaction[]> {
  const qs = clientId
    ? `?client_id=${encodeURIComponent(clientId)}`
    : "";

  return fetcher<Transaction[]>(`/transactions${qs}`, { signal });
}

/* ── Admin: Users ─────────────────────────────────────────────────── */

export interface User {
  id: number;
  name?: string;
  email: string;
  role: string;
  is_active: boolean;
}

export function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  return fetcher<User[]>("/users", { signal });
}

/* ── Admin: Clients ───────────────────────────────────────────────── */

export interface AdminClient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export function fetchAdminClients(
  signal?: AbortSignal
): Promise<AdminClient[]> {
  return fetcher<AdminClient[]>("/clients", { signal });
}

/* ── Admin: Portfolio ─────────────────────────────────────────────── */

export interface AdminPortfolioItem {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  avg_price: number;
  value: number;
}

export interface PortfolioResponse {
  success: boolean;
  data: AdminPortfolioItem[];
}

export interface CreatePortfolioItemPayload {
  symbol: string;
  name: string;
  quantity: number;
  avg_price: number;
  /** Admin only: assign the position to a specific client */
  user_id?: number;
}

export function createPortfolioItem(
  payload: CreatePortfolioItemPayload,
  signal?: AbortSignal
): Promise<AdminPortfolioItem> {
  return fetcher<AdminPortfolioItem>("/portfolio", {
    method: "POST",
    body: payload,
    signal,
  });
}

export async function fetchAdminPortfolio(
  signal?: AbortSignal
): Promise<AdminPortfolioItem[]> {
  const res = await fetcher<PortfolioResponse | AdminPortfolioItem[]>("/portfolio", {
    signal,
    raw: true,
  });

  console.log("Portfolio API:", res);

  const data: unknown = Array.isArray(res)
    ? res
    : (res as PortfolioResponse)?.data ?? (res as any)?.positions ?? [];

  if (!Array.isArray(data)) {
    console.error("Admin portfolio invalid:", data);
    return [];
  }

  return data as AdminPortfolioItem[];
}

/* ── Assets ─────────────────────────────────────────────────────────── */

export type AssetType = "stock" | "mf" | "property";

export interface Asset {
  id: number;
  type: AssetType;
  symbol?: string;
  name: string;
  quantity?: number;
  avg_price?: number;
  value?: number;
  allocation?: number;
  /** Real estate */
  location?: string;
  purchase_price?: number;
  current_value?: number;
  rent_amount?: number;
  rent_due_date?: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_email?: string;
  /** Common */
  tags?: string[];
  user_id?: number;
  created_at?: string;
}

export type CreateAssetPayload = Omit<
  Asset,
  "id" | "value" | "allocation" | "created_at"
>;
export type UpdateAssetPayload = Partial<CreateAssetPayload>;

export interface AssetsSummary {
  total_value: number;
  total_invested: number;
  total_return: number;
  return_percentage: number;
}

export interface AssetsAllocation {
  stock: number;
  mf: number;
  real_estate: number;
}

export interface AssetsResponse {
  summary: AssetsSummary;
  allocation: AssetsAllocation;
  assets: Asset[];
}

export async function fetchAssets(
  clientId?: number,
  signal?: AbortSignal
): Promise<Asset[]> {
  const path =
    clientId !== undefined
      ? `/portfolio?user_id=${encodeURIComponent(clientId)}`
      : "/portfolio/me";

  // Use raw mode so we can handle every envelope shape the backend may return
  // without the fetcher silently discarding top-level keys.
  const res = await fetcher<any>(path, { signal, raw: true });

  console.log("[fetchAssets] raw response for clientId=%s:", clientId, res);

  // Normalise: raw array → { data: [] } → { assets: [] } → { positions: [] }
  const list: unknown = Array.isArray(res)
    ? res
    : res?.data ?? res?.assets ?? res?.positions ?? [];

  if (!Array.isArray(list)) {
    console.error("[fetchAssets] expected array, got:", list);
    return [];
  }

  const normalized = (list as any[]).map((a: any) => ({
    ...a,
    // Normalise backend variants: "real_estate" → "property" so that all tab
    // filters (which test `a.type === "property"`) work regardless of which
    // field name the backend sends.
    type:
      a.type === "real_estate"
        ? "property"
        : a.type ?? a.asset_type,
  }));

  console.log(
    "[fetchAssets] normalized %d item(s) for clientId=%s",
    normalized.length,
    clientId
  );

  return normalized;
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

/**
 * Single-fetch admin endpoint.
 * GET /portfolio/admin → { success: true, data: { [user_id]: Asset[] } }
 *
 * Returns a Record keyed by string user_id so it maps directly to the
 * backend contract.  The `type` field is normalised ("real_estate" → "property")
 * for consistency with the rest of the codebase.
 */

interface AdminGroupedResponse {
  success?: boolean;
  data?: Record<string, RawAsset[]>;
}

interface RawAsset {
  type?: string;
  asset_type?: string;
  [key: string]: unknown;
}

export async function fetchAdminGroupedAssets(
  signal?: AbortSignal
): Promise<Record<string, Asset[]>> {
  const res = await fetcher<AdminGroupedResponse>("/portfolio/admin", {
    signal,
    raw: true,
  });

  // Backend contract: { success: true, data: { [user_id]: Asset[] } }
  const map: Record<string, RawAsset[]> =
    res && typeof res === "object" && !Array.isArray(res) && res.data != null
      ? (res.data as Record<string, RawAsset[]>)
      : {};

  const result: Record<string, Asset[]> = {};
  for (const [uid, rawAssets] of Object.entries(map)) {
    if (!Array.isArray(rawAssets)) continue;
    result[uid] = rawAssets.map((a) => ({
      ...(a as Omit<Asset, "type">),
      type: (a.type === "real_estate"
        ? "property"
        : (a.type ?? a.asset_type)) as Asset["type"],
    }));
  }
  return result;
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
  equity_percentage: number;
  real_estate_percentage: number;
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

  const res = await fetcher<any>(path, { signal, raw: true });

  if (res && typeof res === "object" && "alerts" in res) {
    return {
      equity_percentage: res.equity_percentage ?? 0,
      real_estate_percentage: res.real_estate_percentage ?? 0,
      alerts: Array.isArray(res.alerts) ? res.alerts : [],
    };
  }

  // Fallback: if backend returns an array of InsightItem objects
  if (Array.isArray(res)) {
    return { equity_percentage: 0, real_estate_percentage: 0, alerts: [] };
  }

  return { equity_percentage: 0, real_estate_percentage: 0, alerts: [] };
}

/* ── Mutual Funds ───────────────────────────────────────────────────── */

export interface MutualFundResult {
  code: string;
  name: string;
  nav: number;
  category?: string;
  fund_house?: string;
}

export function searchMutualFunds(
  query: string,
  signal?: AbortSignal
): Promise<MutualFundResult[]> {
  return fetcher<MutualFundResult[]>(
    `/mf/search?q=${encodeURIComponent(query)}`,
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
