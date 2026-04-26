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

// ── Token storage (LOCALSTORAGE) ───────────────────────

const TOKEN_KEY = "access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// ── Fetch wrapper (SINGLE SOURCE OF TRUTH) ─────────────

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
        ...(extraHeaders || {}),
      },
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error("NETWORK ERROR:", err);
    throw new NetworkError("Unable to reach backend API");
  }

  // ── AUTH FAILURE ────────────────────────────────────

  if (response.status === 401 || response.status === 403) {
    console.warn("AUTH ERROR:", response.status);

    clearToken();

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    throw new ApiError(response.status, "Session expired");
  }

  // ── API ERROR ───────────────────────────────────────

  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const data = await response.json();
      message = data?.detail ?? data?.message ?? message;
    } catch {
      // ignore parse errors
    }

    console.error("API ERROR:", message);

    throw new ApiError(response.status, message);
  }

  // ── NO CONTENT ──────────────────────────────────────

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();

  // ── RAW MODE (for login etc.) ───────────────────────

  if (raw) return json as T;

  // ── SUPPORT WRAPPED RESPONSE ────────────────────────

  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

// ── Error formatter ───────────────────────────────────

export function toErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Unable to reach backend API";
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
