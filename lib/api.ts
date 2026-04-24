import { getToken, clearAuth } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Error types ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thrown when the request never reached the server (network down, CORS, etc.) */
export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

// ── Core request wrapper ──────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, signal, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // AbortError should propagate as-is so callers can distinguish cancellations.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new NetworkError(
      err instanceof Error ? err.message : "Network request failed"
    );
  }

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data?.detail ?? data?.message ?? message;
    } catch {
      // ignore JSON parse errors on error bodies
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>("/api/v2/auth/login", {
    method: "POST",
    body: payload,
  });
}

// ── Clients ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email: string;
  portfolio_value: number;
  risk_profile: "conservative" | "moderate" | "aggressive";
}

export function fetchClients(signal?: AbortSignal): Promise<Client[]> {
  return request<Client[]>("/api/v2/clients", { signal });
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
  return request<StockQuote[]>(
    `/api/v2/stocks/search?q=${encodeURIComponent(query)}`,
    { signal }
  );
}

export function fetchStockQuote(
  symbol: string,
  signal?: AbortSignal
): Promise<StockQuote> {
  return request<StockQuote>(`/api/v2/stocks/${encodeURIComponent(symbol)}`, {
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
  return request<PortfolioSummary>(
    `/api/v2/clients/${encodeURIComponent(clientId)}/portfolio`,
    { signal }
  );
}

// ── Auth: signup / password reset ─────────────────────────────────────────────

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export function signup(payload: SignupPayload): Promise<void> {
  return request<void>("/api/v2/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export interface ForgotPasswordPayload {
  email: string;
}

export function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  return request<void>("/api/v2/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  return request<void>("/api/v2/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

