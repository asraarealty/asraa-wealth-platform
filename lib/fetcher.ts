export const API_BASE_URL = "/api/v2";

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

// 🔐 TOKEN STORAGE (in-memory only)
let inMemoryToken: string | null = null;
let authBootstrapComplete = false;

function isJwtExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length < 2) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const atobFn = typeof globalThis.atob === "function" ? globalThis.atob : undefined;
    const json =
      typeof atobFn === "function"
        ? atobFn(base64)
        : typeof Buffer !== "undefined"
          ? Buffer.from(base64, "base64").toString("utf8")
          : "";
    if (!json) return false;
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== "object" || typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function getToken(): string | null {
  if (!inMemoryToken) return null;
  if (isJwtExpired(inMemoryToken)) {
    clearToken();
    return null;
  }
  return inMemoryToken;
}

export function setToken(token: string) {
  inMemoryToken = token;
}

export function clearToken() {
  inMemoryToken = null;
}

export function setAuthBootstrapComplete(ready: boolean) {
  authBootstrapComplete = ready;
}

// ── FETCH WRAPPER ──────────────────────────────────────

interface FetcherOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  raw?: boolean;
  /** Number of automatic retries for transient failures (network/5xx). */
  retries?: number;
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
  const {
    body,
    headers: extraHeaders,
    signal,
    raw,
    retries,
    noRedirectOn401,
    ...rest
  } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const hasExplicitContentType =
    extraHeaders &&
    Object.keys(extraHeaders).some((key) => key.toLowerCase() === "content-type");

  const requestBody =
    body === undefined
      ? undefined
      : isFormData || typeof body === "string"
        ? (body as BodyInit)
        : JSON.stringify(body);

  const token = getToken();

  const url = (path.startsWith("http") || path.startsWith("/auth/"))
    ? path
    : `${API_BASE_URL}${path}`;

  const method = String(rest.method ?? "GET").toUpperCase();
  const defaultRetries = ["GET", "HEAD", "OPTIONS"].includes(method) ? 1 : 0;
  const maxRetries = Math.max(0, retries ?? defaultRetries);
  const calculateBackoffDelay = (attempt: number) => 250 * (attempt + 1);

  const executeRequest = async (): Promise<Response> => {
    let attempt = 0;
    let lastNetworkError: unknown = null;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, {
          ...rest,
          credentials: "include",
          headers: {
            ...(body !== undefined && !isFormData && !hasExplicitContentType
              ? { "Content-Type": "application/json" }
              : {}),
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(extraHeaders || {}),
          },
          signal,
          body: requestBody,
        });

        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, calculateBackoffDelay(attempt)));
          attempt += 1;
          continue;
        }
        return response;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        lastNetworkError = err;
        if (attempt >= maxRetries) break;
        await new Promise((resolve) => setTimeout(resolve, calculateBackoffDelay(attempt)));
        attempt += 1;
      }
    }

    throw lastNetworkError ?? new Error("Network request failed");
  };

  let response: Response;
  try {
    response = await executeRequest();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new NetworkError("Unable to reach backend API");
  }

  // Removed console.log("API Response:", response.status);

  // 🔐 401 → session expired → logout (unless caller opts out)
  if (response.status === 401) {
    if (!noRedirectOn401 && authBootstrapComplete && typeof window !== "undefined") {
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
    const apiErr = new ApiError(response.status, message);
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
