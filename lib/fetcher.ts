export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.asraarealty.in";

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

// ── Token helpers ─────────────────────────────────────────────────────────────

const TOKEN_LS_KEY = "access_token";
/** Cookie name that the server-side proxy reads to gate protected routes. */
const TOKEN_COOKIE_NAME = "access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_LS_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_LS_KEY, token);
  // Mirror to a readable cookie so proxy.ts can gate protected routes
  // without needing access to localStorage (which is client-only).
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; SameSite=Strict${secure}`;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_LS_KEY);
  // Expire the mirror cookie.
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

interface FetcherOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Core fetch helper. Automatically attaches an `Authorization: Bearer <token>`
 * header when a token is present in localStorage. Handles JSON parsing and
 * error normalisation.
 *
 * On a 401 response the stored token is cleared and the user is redirected to
 * /login.
 */
export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, signal, ...rest } = options;

  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers,
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("Network error:", err);
    throw new NetworkError("Unable to reach backend API");
  }

  if (response.status === 401) {
    clearToken();
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

  const json = await response.json();
  // Backend wraps responses as { success: boolean, data: any }.
  // Unwrap `data` when present; otherwise return the raw JSON (e.g. /auth/login).
  if (json !== null && typeof json === "object" && "data" in json) {
    if (json.data === null || json.data === undefined) {
      console.warn(`[fetcher] ${path}: response has 'data' key but value is`, json.data);
    }
    return json.data as T;
  }
  return json as T;
}

/**
 * Converts an unknown thrown value to a human-readable error string.
 * Normalises network/API errors into user-friendly messages.
 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError) return err.message || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message || "Something went wrong";
  return "Something went wrong";
}
