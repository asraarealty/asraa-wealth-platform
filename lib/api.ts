export {
  API_BASE_URL,
  ApiError,
  NetworkError,
  getStoredToken,
  storeToken,
  clearToken,
  fetcher,
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
  id: string;
  email: string;
  role: string;
}

/** Fetch the authenticated user's profile from the backend. */
export function getMe(): Promise<MeResponse> {
  return fetcher<MeResponse>("/auth/me");
}

/** Terminate the session on the backend. */
export function logout(): Promise<void> {
  return fetcher<void>("/auth/logout", { method: "POST" });
}

// ── Users / Clients ───────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email: string;
  portfolio_value: number;
  risk_profile: "conservative" | "moderate" | "aggressive";
}

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  return fetcher<Client[]>("/users", { signal });
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

export interface PortfolioSummary {
  total_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  day_gain_loss: number;
  day_gain_loss_percent: number;
  positions: PortfolioPosition[];
}

export interface PortfolioPosition {
  symbol: string;
  name: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
  gain_loss_percent: number;
}

export function fetchPortfolio(
  clientId: string,
  signal?: AbortSignal
): Promise<PortfolioSummary> {
  return fetcher<PortfolioSummary>(
    `/portfolio?client_id=${encodeURIComponent(clientId)}`,
    { signal }
  );
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
  const qs = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
  return fetcher<Transaction[]>(`/transactions${qs}`, { signal });
}

// ── Auth: signup / password reset ─────────────────────────────────────────────

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export function signup(payload: SignupPayload): Promise<void> {
  return fetcher<void>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export interface ForgotPasswordPayload {
  email: string;
}

export function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  return fetcher<void>("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  return fetcher<void>("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

