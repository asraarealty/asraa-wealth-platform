import {
  API_BASE_URL,
  ApiError,
  NetworkError,
  abortAllRequests,
  clearApiClientCaches,
  createApiClient,
  inflight,
  type ApiClientRequestOptions,
} from "./api/client";
import {
  notifyAuthFailure,
  noteUnauthorizedRequest,
  reportAuthTelemetry,
  resetUnauthorizedBurstCounter,
  runWithGlobalRefresh,
} from "./authLifecycle";

export { API_BASE_URL, ApiError, NetworkError };

// 🔐 TOKEN STORAGE

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {}
}

export function clearRefreshToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
}

export function clearAuthTokens() {
  clearToken();
  clearRefreshToken();
}

function readTokenFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;
  const token =
    record.access_token ??
    record.accessToken ??
    record.token ??
    nested?.access_token ??
    nested?.accessToken ??
    nested?.token;
  return typeof token === "string" && token.trim() ? token : null;
}

function readRefreshTokenFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;
  const token =
    record.refresh_token ??
    record.refreshToken ??
    nested?.refresh_token ??
    nested?.refreshToken;
  return typeof token === "string" && token.trim() ? token : null;
}

function isAuthEndpoint(path: string): boolean {
  return path.startsWith("/auth/");
}

async function refreshAccessToken(): Promise<string> {
  const startedAt =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const existingRefreshToken = getRefreshToken();
  const payload =
    existingRefreshToken && existingRefreshToken.trim()
      ? { refresh_token: existingRefreshToken, refreshToken: existingRefreshToken }
      : undefined;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: payload
      ? {
          Accept: "application/json",
          "Content-Type": "application/json",
        }
      : {
          Accept: "application/json",
        },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Unable to refresh session");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = undefined;
  }

  const nextAccessToken = readTokenFromPayload(json);
  if (!nextAccessToken) {
    throw new Error("Refresh response missing access token");
  }
  const nextRefreshToken = readRefreshTokenFromPayload(json);
  setToken(nextAccessToken);
  if (nextRefreshToken) setRefreshToken(nextRefreshToken);

  const duration =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now() - startedAt
      : Date.now() - startedAt;
  reportAuthTelemetry({
    type: "refresh",
    durationMs: Number(duration.toFixed(2)),
  });

  return nextAccessToken;
}

// ── FETCH WRAPPER ──────────────────────────────────────

export interface FetcherOptions extends ApiClientRequestOptions {
  _authRetry?: boolean;
}

const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  defaultRetry: 2,
  getAuthToken: () => getToken(),
});

export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { _authRetry, ...requestOptions } = options;
  try {
    return await apiClient.request<T>(path, requestOptions);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || _authRetry || isAuthEndpoint(path)) {
      throw error;
    }

    noteUnauthorizedRequest();

    try {
      await runWithGlobalRefresh(async () => refreshAccessToken());
      return await fetcher<T>(path, { ...requestOptions, _authRetry: true });
    } catch (refreshError) {
      clearAuthTokens();
      clearApiClientCaches();
      abortAllRequests();
      notifyAuthFailure("refresh-failed");
      reportAuthTelemetry({
        type: "refresh-failed",
        reason: refreshError instanceof Error ? refreshError.message : "Refresh failed",
      });
      throw error;
    }
  }
}

export { inflight };
export { abortAllRequests, clearApiClientCaches };
export { resetUnauthorizedBurstCounter };

// ── Error formatter ───────────────────────────────────

export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError)
    return err.message || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message || "Something went wrong";
  return "Something went wrong";
}
