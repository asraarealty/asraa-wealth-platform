export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.asraarealty.in";

// ── Error types ─────────────────────────────────────

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

// ── TOKEN STORAGE ───────────────────────────────────

const TOKEN_KEY = "access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// ── FETCH WRAPPER ───────────────────────────────────

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

  const url = `${API_BASE_URL}${path}`;

  // 🔍 DEBUG (VERY IMPORTANT)
  console.log("API CALL →", url);

  let response: Response;

  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extraHeaders || {}),
      },
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error("NETWORK ERROR:", err);
    throw new NetworkError("Unable to reach backend API");
  }

  // 🔐 Handle auth expiry
  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired");
  }

  // ❌ Handle errors
  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const data = await response.json();
      message = data?.detail ?? data?.message ?? message;
    } catch {}

    console.error("API ERROR:", url, message);

    throw new ApiError(response.status, message);
  }

  // ✅ No content
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();

  // 🔁 Raw mode (login, etc.)
  if (raw) return json as T;

  // 🧠 Support both wrapped + direct responses
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

// ── ERROR FORMATTER ─────────────────────────────────

export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
