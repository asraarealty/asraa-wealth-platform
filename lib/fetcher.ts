import {
  API_BASE_URL,
  ApiError,
  NetworkError,
  createApiClient,
  inflight,
  type ApiClientRequestOptions,
} from "./api/client";

export { API_BASE_URL, ApiError, NetworkError };

// 🔐 TOKEN STORAGE

const TOKEN_KEY = "access_token";

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

// ── FETCH WRAPPER ──────────────────────────────────────

export interface FetcherOptions extends ApiClientRequestOptions {}

const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  defaultRetry: 2,
  getAuthToken: () => getToken(),
  onUnauthorized: () => {
    clearToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  },
});

export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  return apiClient.request<T>(path, options);
}

export { inflight };

// ── Error formatter ───────────────────────────────────

export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError)
    return err.message || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message || "Something went wrong";
  return "Something went wrong";
}
