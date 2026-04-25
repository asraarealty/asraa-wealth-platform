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

// ── Core fetch wrapper (COOKIE BASED) ─────────────────────────────────────────

interface FetcherOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  raw?: boolean;
}

export async function fetcher<T>(
  path: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, signal, raw, ...rest } = options;

  // 🔧 single request builder (important)
  const makeRequest = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(extraHeaders || {}),
      },
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response: Response;

  try {
    response = await makeRequest();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("Network error:", err);
    throw new NetworkError("Unable to reach backend API");
  }

  // ── 🔁 AUTO REFRESH (SAFE VERSION) ────────────────────────────────────────

  if (response.status === 401) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        // retry once only
        response = await makeRequest();
      } else {
        throw new Error("Refresh failed");
      }
    } catch (err) {
      console.warn("Session expired:", err);

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

  if (json && typeof json === "object" && "data" in json) {
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
