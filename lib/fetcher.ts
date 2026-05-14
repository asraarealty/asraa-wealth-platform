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

// 🔐 TOKEN STORAGE
let inMemoryToken: string | null = null;
let authBootstrapComplete = false;
let clientAuthMarkerSynced = false;
const TOKEN_STORAGE_KEY = "token";
const LEGACY_TOKEN_STORAGE_KEY = "access_token";
const CLIENT_AUTH_MARKER_COOKIE = "asraa_auth";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim();
    if (token) return token;

    const legacyToken = localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY)?.trim();
    if (legacyToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, legacyToken);
      return legacyToken;
    }
  } catch {}
  return null;
}

function persistToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
      // Deliberately non-HttpOnly marker (value is only "1", never a credential):
      // it lets server-side route guards know a client token exists during hydration.
      document.cookie = `${CLIENT_AUTH_MARKER_COOKIE}=1; Path=/; SameSite=Lax${secureAttr}`;
      return;
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    document.cookie = `${CLIENT_AUTH_MARKER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {}
}

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
  if (!inMemoryToken) {
    inMemoryToken = readStoredToken();
    if (inMemoryToken && !clientAuthMarkerSynced) {
      persistToken(inMemoryToken);
      clientAuthMarkerSynced = true;
    }
  }
  if (!inMemoryToken) return null;
  if (isJwtExpired(inMemoryToken)) {
    clearToken();
    return null;
  }
  return inMemoryToken;
}

export function setToken(token: string) {
  inMemoryToken = token;
  persistToken(token);
  clientAuthMarkerSynced = Boolean(token);
}

export function clearToken() {
  inMemoryToken = null;
  persistToken(null);
  clientAuthMarkerSynced = false;
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
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
  /** When true, a 401 response throws ApiError without clearing the token or
   *  redirecting to /login. Use for optional / non-critical endpoints (e.g.
   *  stock search) where an auth failure should be surfaced as a UI error
   *  rather than a full-page redirect. */
  noRedirectOn401?: boolean;
}

const GLOBAL_TOAST_EVENT = "asraa:toast";

function emitGlobalToast(message: string, type: "success" | "error" | "info" = "error") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GLOBAL_TOAST_EVENT, {
      detail: { message, type },
    })
  );
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
    timeoutMs = 20_000,
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

  const url = (path.startsWith("http") || path.startsWith("/auth/") || path.startsWith("/api/"))
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
        const timeoutController = new AbortController();
        const timeoutId =
          timeoutMs > 0
            ? globalThis.setTimeout(() => {
              timeoutController.abort();
            }, timeoutMs)
            : null;

        let requestSignal: AbortSignal = timeoutController.signal;
        let detachParentAbort: (() => void) | null = null;
        if (signal) {
          if (typeof AbortSignal.any === "function") {
            requestSignal = AbortSignal.any([signal, timeoutController.signal]);
          } else {
            const onAbort = () => timeoutController.abort();
            if (signal.aborted) onAbort();
            else signal.addEventListener("abort", onAbort, { once: true });
            detachParentAbort = () => signal.removeEventListener("abort", onAbort);
          }
        }

        let response: Response;
        try {
          response = await fetch(url, {
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
            signal: requestSignal,
            body: requestBody,
          });
        } finally {
          if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
          detachParentAbort?.();
        }

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
    if (err instanceof DOMException && err.name === "AbortError") {
      emitGlobalToast("Request timed out — please retry", "error");
      throw new NetworkError("Request timed out");
    }
    if (process.env.NODE_ENV === "development") {
      console.debug("[fetcher] Network error", { method, url, payload: body });
    }
    emitGlobalToast("Unable to reach backend API", "error");
    throw new NetworkError("Unable to reach backend API");
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[fetcher]", { method, url, payload: body, status: response.status });
  }

  // 🔐 401 → session expired → logout (unless caller opts out)
  if (response.status === 401) {
    if (!noRedirectOn401 && authBootstrapComplete && typeof window !== "undefined") {
      clearToken();

      // avoid redirect loop
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    emitGlobalToast("Session expired", "error");
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

    // Override with user-friendly messages for common status codes when no server detail is available
    if (response.status === 404 && message === `HTTP ${response.status}`) message = "Resource not found";
    if (response.status === 405 && message === `HTTP ${response.status}`) message = "This action is not supported by the server";
    if (response.status === 409 && message === `HTTP ${response.status}`) message = "This entry already exists";
    if (response.status === 422 && message === `HTTP ${response.status}`) message = "Please check required fields";
    if (response.status === 500 && message === `HTTP ${response.status}`) message = "Server error — try again later";

    if (process.env.NODE_ENV === "development") {
      console.debug("[fetcher] API error", { method, url, status: response.status, message });
    }
    if ([409, 422, 500].includes(response.status)) {
      emitGlobalToast(message, "error");
    }
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

  if (process.env.NODE_ENV === "development") {
    console.debug("[fetcher] response body", { method, url, status: response.status, response: json });
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
