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

/**
 * Attempt to silently refresh the access token using the stored refresh token
 * cookie. Returns true if the backend issued new cookies, false otherwise.
 */
async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/v2/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Core fetch wrapper. All requests include cookies (`credentials: "include"`)
 * so the backend can authenticate via HTTP-only cookies. No Authorization
 * header is sent — tokens are never accessible to JavaScript.
 *
 * On a 401 response the wrapper attempts one silent token refresh; if the
 * refresh succeeds the original request is retried. If the refresh fails the
 * user is redirected to /login.
 *
 * @param _skipRefresh - Internal flag to prevent infinite refresh loops.
 */
async function request<T>(
  path: string,
  options: RequestOptions = {},
  _skipRefresh = false
): Promise<T> {
  const { body, headers: extraHeaders, signal, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      credentials: "include",
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

  if (response.status === 401 && !_skipRefresh) {
    // Try a silent token refresh and replay the original request once.
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    // Refresh failed — session is definitively expired.
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired");
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

/**
 * The backend sets HTTP-only access_token and refresh_token cookies on
 * success and returns only a success flag — tokens are never in JSON.
 */
export interface LoginResponse {
  success: boolean;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  // FastAPI's OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
  // with a "username" field (not "email") and "password". This diverges from the
  // JSON-based `request()` helper intentionally — the login endpoint has a
  // different content-type requirement than all other API calls.
  const body = new URLSearchParams();
  body.append("username", payload.email);
  body.append("password", payload.password);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v2/auth/login`, {
      method: "POST",
      body,
      credentials: "include",
    });
  } catch (err) {
    throw new NetworkError(
      err instanceof Error ? err.message : "Network request failed"
    );
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

  return response.json() as Promise<LoginResponse>;
}

export interface MeResponse {
  id: string;
  email: string;
  role: string;
}

/** Fetch the authenticated user's profile from the backend. */
export function getMe(): Promise<MeResponse> {
  return request<MeResponse>("/api/v2/auth/me");
}

/**
 * Terminate the session. The backend deletes the refresh token from the DB
 * and clears both HTTP-only cookies via Set-Cookie.
 */
export function logout(): Promise<void> {
  return request<void>("/api/v2/auth/logout", { method: "POST" });
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

