export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.asraarealty.in";

// ── Error types ───────────────────────────────────────────────────────────────

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

// ── Token helpers ─────────────────────────────────────────────────────────────

const TOKEN_LS_KEY = "access_token";
const TOKEN_COOKIE_NAME = "access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_LS_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_LS_KEY, token);

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; path=/; SameSite=Strict${secure}`;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_LS_KEY);
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

interface FetcherOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  raw?: boolean;
}

export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, signal, raw, ...rest } = options;

  let token = getStoredToken();

  const makeRequest = async (overrideToken?: string) => {
    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(overrideToken || token
          ? { Authorization: `Bearer ${overrideToken || token}` }
          : {}),
        ...(extraHeaders as Record<string, string>),
      },
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  };

  let response: Response;

  try {
    response = await makeRequest();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("Network error:", err);
    throw new NetworkError("Unable to reach backend API");
  }

  // ── 🔁 AUTO REFRESH LOGIC ─────────────────────────────────────────────────

  if (response.status === 401) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();

        if (data?.access_token) {
          storeToken(data.access_token);
          token = data.access_token;

          // 🔁 Retry original request
          response = await makeRequest(token);
        } else {
          throw new Error("No access_token in refresh response");
        }
      } else {
        throw new Error("Refresh request failed");
      }
    } catch (err) {
      console.warn("Token refresh failed:", err);

      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      throw new ApiError(401, "Session expired");
    }
  }

  // ── Error handling ─────────────────────────────────────────────────────────

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data?.detail ?? data?.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();

  // ── Response handling ──────────────────────────────────────────────────────

  if (raw) return json as T;

  if (json !== null && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

// ── Error formatter ──────────────────────────────────────────────────────────

export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError)
    return err.message || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message || "Something went wrong";
  return "Something went wrong";
}
