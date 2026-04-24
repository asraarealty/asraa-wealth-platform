import { getToken, removeToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    removeToken();
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
      // ignore parse errors
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

export function fetchClients(): Promise<Client[]> {
  return request<Client[]>("/api/v2/clients");
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

export function searchStocks(query: string): Promise<StockQuote[]> {
  return request<StockQuote[]>(
    `/api/v2/stocks/search?q=${encodeURIComponent(query)}`
  );
}

export function fetchStockQuote(symbol: string): Promise<StockQuote> {
  return request<StockQuote>(`/api/v2/stocks/${encodeURIComponent(symbol)}`);
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

export function fetchPortfolio(clientId: string): Promise<PortfolioSummary> {
  return request<PortfolioSummary>(
    `/api/v2/clients/${encodeURIComponent(clientId)}/portfolio`
  );
}
