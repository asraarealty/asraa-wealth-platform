import * as Sentry from "@sentry/nextjs";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.asraarealty.in";

// ── Error types ─────────────────────────────────────────

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

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

interface FetcherOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  raw?: boolean;
  /** When true, a 401 response throws ApiError without clearing the token or
   *  redirecting to /login. Use for optional / non-critical endpoints (e.g.
   *  stock search) where an auth failure should be surfaced as a UI error
   *  rather than a full-page redirect. */
  noRedirectOn401?: boolean;
}

export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, signal, raw, noRedirectOn401, ...rest } = options;

  const token = getToken();

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path}`;

  if (process.env.NODE_ENV !== "production") {
    console.log("API Request:", url, options);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extraHeaders || {}),
      },
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("🌐 Network error:", err);
    const networkErr = new NetworkError("Unable to reach backend API");
    Sentry.captureException(networkErr, { extra: { url, payload: options?.body } });
    throw networkErr;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("API Response:", response.status);
  }

  // 🔐 401 → session expired → logout (unless caller opts out)
  if (response.status === 401) {
    if (!noRedirectOn401 && typeof window !== "undefined") {
      clearToken();

      // avoid redirect loop
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    throw new ApiError(401, "Session expired");
  }

  // 🚫 403 → forbidden → DO NOT logout
  if (response.status === 403) {
    throw new ApiError(403, "Forbidden");
  }

  // ❌ Other API errors
  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const data = await response.json();
      // FastAPI returns validation errors as detail: [{loc, msg, type}, ...]
      // Fall through each shape until we find a readable string.
      message =
        data?.detail?.[0]?.msg ||
        (typeof data?.detail === "string" ? data.detail : undefined) ||
        data?.message ||
        message;
    } catch {}

    console.error("❌ API Error:", message);
    const apiErr = new ApiError(response.status, message);
    Sentry.captureException(apiErr, { extra: { url, payload: options?.body } });
    throw apiErr;
  }

  // ✅ NO CONTENT
  if (response.status === 204) {
    return undefined as T;
  }

  let json: any;

  try {
    json = await response.json();
  } catch {
    return undefined as T;
  }

  // 🔁 RAW MODE
  if (raw) return json as T;

  // 📦 CHECK { success, data, error } envelope
  if (json && typeof json === "object" && "success" in json) {
    if (json.success === false) {
      throw new ApiError(response.status, json.error || "API error");
    }
    if ("data" in json) {
      return json.data as T;
    }
  }

  // 📦 UNWRAP { data }
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

// ── Error formatter ───────────────────────────────────

export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError)
    return err.message || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message || "Something went wrong";
  return "Something went wrong";
}
