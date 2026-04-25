```ts
export {
  API_BASE_URL,
  ApiError,
  NetworkError,
  getStoredToken,
  storeToken,
  clearToken,
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
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return fetcher<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export interface MeResponse {
  id: number;
  name: string;
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

/**
 * FIXED: unwrap backend response { positions: [] }
 */
export function fetchPortfolioItems(
  clientId?: number,
  signal?: AbortSignal
): Promise<Portfolio[]> {
  const qs =
    clientId !== undefined
      ? `?client_id=${encodeURIComponent(clientId)}`
      : "";

  return fetcher<any>(`/portfolio${qs}`, { signal }).then((res) => {
    return res?.positions || [];
  });
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
  name: string;
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

// ── Admin: Portfolio (FIXED) ──────────────────────────────────────────────────

export interface AdminPortfolioItem {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  value: number;
}

export function fetchAdminPortfolio(
  signal?: AbortSignal
): Promise<AdminPortfolioItem[]> {
  return fetcher<any>("/portfolio", { signal }).then((res) => {
    return res?.positions || [];
  });
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
```
