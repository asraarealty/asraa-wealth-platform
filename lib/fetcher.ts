// Path prefix only (not a full domain URL); rewritten by Next.js to BACKEND_URL.
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

interface MemoizedEntry {
  expiresAt: number;
  value: unknown;
}

const REQUEST_MEMO_TTL_MS = 20_000;
const requestMemoCache = new Map<string, MemoizedEntry>();
const requestMemoInFlight = new Map<string, Promise<unknown>>();

function pathFromUrl(url: string): string {
  try {
    if (url.startsWith("http")) return new URL(url).pathname;
  } catch {}
  return url;
}

function shouldMemoizeRequest(path: string, method: string, hasSignal: boolean): boolean {
  if (hasSignal) return false;
  if (method === "POST" && path.endsWith("/stocks/v2/bulk")) return true;
  if (method !== "GET") return false;
  return (
    path.includes("/mutual-funds/search") ||
    path.includes("/commodities/search") ||
    path.includes("/stocks/search")
  );
}

function createMemoKey(method: string, url: string, body: unknown) {
  const bodyKey = body === undefined ? "" : JSON.stringify(body);
  return `${method}::${url}::${bodyKey}`;
}

export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, signal, raw, noRedirectOn401, ...rest } = options;

  const token = getToken();

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let url = path;

  if (!path.startsWith("http")) {
    url = normalizedPath.startsWith(API_BASE_URL)
      ? normalizedPath
      : `${API_BASE_URL}${normalizedPath}`;
  }

  const requestMethod = String(rest.method ?? "GET").toUpperCase();
  const requestPath = pathFromUrl(url);
  const memoize = shouldMemoizeRequest(requestPath, requestMethod, Boolean(signal));
  const memoKey = memoize ? createMemoKey(requestMethod, url, body) : null;

  if (memoize && memoKey) {
    const cached = requestMemoCache.get(memoKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
    const inflight = requestMemoInFlight.get(memoKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const startedAt =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();

  const run = async (): Promise<T> => {
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
      const networkErr = new NetworkError("Unable to reach backend API");
      throw networkErr;
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
      // Non-JSON responses are allowed for 204-like backend behavior.
    }

    if (json === undefined) return undefined as T;

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
  };

  const logTiming = (status: "ok" | "error", error?: unknown) => {
    if (typeof window === "undefined") return;
    if (typeof performance === "undefined" || typeof performance.now !== "function") return;
    const duration = performance.now() - startedAt;
    const payload = {
      type: "query-timing",
      method: requestMethod,
      path: requestPath,
      status,
      durationMs: Number(duration.toFixed(2)),
    };
    if (status === "error") {
      console.warn("[perf]", payload, error);
    } else {
      console.info("[perf]", payload);
    }
  };

  const job = run()
    .then((value) => {
      if (memoize && memoKey) {
        requestMemoCache.set(memoKey, {
          value,
          expiresAt: Date.now() + REQUEST_MEMO_TTL_MS,
        });
      }
      logTiming("ok");
      return value;
    })
    .catch((error) => {
      logTiming("error", error);
      throw error;
    })
    .finally(() => {
      if (memoize && memoKey) requestMemoInFlight.delete(memoKey);
    });

  if (memoize && memoKey) {
    requestMemoInFlight.set(memoKey, job as Promise<unknown>);
  }

  return job;
}

// ── Error formatter ───────────────────────────────────

export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError)
    return err.message || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message || "Something went wrong";
  return "Something went wrong";
}
