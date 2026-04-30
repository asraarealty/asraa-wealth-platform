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
  current_price: number;
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
  current_price: number;
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
  current_price?: number;
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
  "id" | "current_price" | "value" | "allocation" | "created_at"
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
): Promise<AssetsResponse> {
  const path =
    clientId !== undefined
      ? `/portfolio?user_id=${encodeURIComponent(clientId)}`
      : "/assets/me";

  const res = await fetcher<any>(path, { signal, raw: true });

  // Unwrap { data: ... } envelope when present (e.g. { data: { assets, summary, allocation } })
  const unwrapped =
    res && typeof res === "object" && !Array.isArray(res) && res.data != null
      ? res.data
      : res;

  // Backend returns { summary, allocation, assets }
  if (unwrapped && typeof unwrapped === "object" && "assets" in unwrapped) {
    const assets: Asset[] = Array.isArray(unwrapped.assets) ? unwrapped.assets : [];
    return {
      summary: unwrapped.summary ?? {
        total_value: 0,
        total_invested: 0,
        total_return: 0,
        return_percentage: 0,
      },
      allocation: unwrapped.allocation ?? { stock: 0, mf: 0, real_estate: 0 },
      assets,
    };
  }

  // Fallback: handle legacy array response
  const assets: Asset[] = Array.isArray(unwrapped)
    ? unwrapped
    : (unwrapped?.assets ?? []);

  const totalValue = assets.reduce(
    (s, a) => s + (a.value ?? a.current_value ?? 0),
    0
  );
  const totalInvested = assets.reduce((s, a) => {
    const cost =
      a.type === "property"
        ? (a.purchase_price ?? 0)
        : (a.avg_price ?? 0) * (a.quantity ?? 1);
    return s + cost;
  }, 0);

  return {
    summary: {
      total_value: totalValue,
      total_invested: totalInvested,
      total_return: totalValue - totalInvested,
      return_percentage:
        totalInvested > 0
          ? ((totalValue - totalInvested) / totalInvested) * 100
          : 0,
    },
    allocation: { stock: 0, mf: 0, real_estate: 0 },
    assets,
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
  equity_percentage: number;
  real_estate_percentage: number;
  /** Backend may return plain strings or structured InsightItem objects */
  alerts: (string | InsightItem)[];
}

export async function fetchInsights(
  signal?: AbortSignal
): Promise<InsightsResponse> {
  const res = await fetcher<any>("/insights/me", { signal, raw: true });

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
    { signal }
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
