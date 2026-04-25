export {
  API_BASE_URL,
  ApiError,
  NetworkError,
  fetcher,
  toErrorMessage,
} from "./fetcher";

import { fetcher } from "./fetcher";

// ── Auth ──────────────────────────────────────────────────────────────────────

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
  name?: string; // ✅ made optional (safe)
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

// ── Clients ───────────────────────────────────────────────────────────────────

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

// ── Stocks ────────────────────────────────────────────────────────────────────

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
    `/stocks?q=${encodeURIComponent(query)}`,
    { signal }
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

// ── Portfolio ─────────────────────────────────────────────────────────────────

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

export async function fetchPortfolioItems(
  clientId?: number,
  signal?: AbortSignal
): Promise<PortfolioResult> {
  const qs =
    clientId !== undefined
      ? `?client_id=${encodeURIComponent(clientId)}`
      : "";

  const res = await fetcher<any>(`/portfolio${qs}`, { signal, raw: true });

  const data: unknown = Array.isArray(res)
    ? res
    : (res?.data ?? res?.positions ?? []);

  const meta: Partial<PortfolioMeta> = res?.meta ?? {};

  if (!Array.isArray(data)) {
    console.error("Portfolio data invalid:", data);
    return { items: [], meta };
  }

  return { items: data as Portfolio[], meta };
}

// ── Transactions ──────────────────────────────────────────────────────────────

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

// ── Admin: Users ──────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name?: string; // ✅ optional
  email: string;
  role: string;
  is_active: boolean;
}

export function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  return fetcher<User[]>("/users", { signal });
}

// ── Admin: Clients ────────────────────────────────────────────────────────────

export interface AdminClient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export function fetchAdminClients(signal?: AbortSignal): Promise<AdminClient[]> {
  return fetcher<AdminClient[]>("/clients", { signal });
}

// ── Admin: Portfolio ──────────────────────────────────────────────────────────

export interface AdminPortfolioItem {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  value: number;
}

export async function fetchAdminPortfolio(
  signal?: AbortSignal
): Promise<AdminPortfolioItem[]> {
  const res = await fetcher<any>("/portfolio", { signal, raw: true });

  const data: unknown = Array.isArray(res)
    ? res
    : (res?.data ?? res?.positions ?? []);

  if (!Array.isArray(data)) {
    console.error("Admin portfolio invalid:", data);
    return [];
  }

  return data as AdminPortfolioItem[];
}

// ── Auth Extras ───────────────────────────────────────────────────────────────

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
