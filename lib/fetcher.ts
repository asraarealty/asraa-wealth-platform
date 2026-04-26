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
}

export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, signal, raw, ...rest } = options;

  const token = getToken();

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extraHeaders as Record<string, string>),
      },
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("🌐 Network error:", err);
    throw new NetworkError("Unable to reach backend API");
  }

  // 🔐 AUTH FAILURE
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== "undefined") {
      clearToken();

      // prevent redirect loop
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    throw new ApiError(response.status, "Session expired");
  }

  // ❌ API ERROR
  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const data = await response.json();
      message = data?.detail ?? data?.message ?? message;
    } catch {}

    console.error("❌ API Error:", message);
    throw new ApiError(response.status, message);
  }

  // ✅ NO CONTENT
  if (response.status === 204) {
    return undefined as T;
  }

  let json: unknown;

  try {
    json = await response.json();
  } catch {
    return undefined as T;
  }

  // 🔁 RAW MODE
  if (raw) return json as T;

  // 📦 UNWRAP { data }
  if (json && typeof json === "object" && "data" in json) {
    return (json as any).data as T;
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
