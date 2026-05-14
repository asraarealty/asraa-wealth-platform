/**
 * Centralized API client.
 *
 * Wraps the `fetcher` utility to provide named HTTP-method helpers with:
 *   - Automatic auth token injection (handled by fetcher)
 *   - API prefix management (handled by fetcher via API_BASE_URL)
 *   - Retry and timeout handling (handled by fetcher)
 *   - Normalized error handling (handled by fetcher)
 *   - Typed responses
 *
 * All API calls in the application should go through this client rather
 * than calling `fetch()` directly or importing `fetcher` individually.
 *
 * @example
 * import { apiClient } from "@/lib/api/client";
 *
 * const clients = await apiClient.get<Client[]>("/clients");
 * const asset   = await apiClient.post<Asset>("/assets", payload);
 */

import { fetcher, type ApiError, type NetworkError } from "@/lib/fetcher";

type FetcherOverrides = {
  signal?: AbortSignal;
  /** Number of automatic retries for transient failures. */
  retries?: number;
  /** Request timeout in milliseconds (default: 20 000). */
  timeoutMs?: number;
  /** When true a 401 response throws without clearing the session. */
  noRedirectOn401?: boolean;
  /** When true the raw JSON is returned without envelope-unwrapping. */
  raw?: boolean;
};

export type { ApiError, NetworkError };

export const apiClient = {
  /**
   * GET `path`.  Returns the unwrapped response body.
   */
  get<T>(path: string, options: FetcherOverrides = {}): Promise<T> {
    return fetcher<T>(path, { method: "GET", ...options });
  },

  /**
   * POST `path` with `body`.  Returns the unwrapped response body.
   */
  post<T>(path: string, body?: unknown, options: FetcherOverrides = {}): Promise<T> {
    return fetcher<T>(path, { method: "POST", body, ...options });
  },

  /**
   * PATCH `path` with `body`.  Returns the unwrapped response body.
   */
  patch<T>(path: string, body?: unknown, options: FetcherOverrides = {}): Promise<T> {
    return fetcher<T>(path, { method: "PATCH", body, ...options });
  },

  /**
   * PUT `path` with `body`.  Returns the unwrapped response body.
   */
  put<T>(path: string, body?: unknown, options: FetcherOverrides = {}): Promise<T> {
    return fetcher<T>(path, { method: "PUT", body, ...options });
  },

  /**
   * DELETE `path`.  Returns the unwrapped response body (often `void`).
   */
  delete<T = void>(path: string, options: FetcherOverrides = {}): Promise<T> {
    return fetcher<T>(path, { method: "DELETE", ...options });
  },
};
