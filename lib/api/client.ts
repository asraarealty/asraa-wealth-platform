/**
 * Canonical HTTP client.
 *
 * RULE 3 — SINGLE HTTP CLIENT
 * All network requests must go through apiClient. Never use fetch(),
 * axios(), or backendGet() directly in components or pages.
 *
 * Usage:
 *   import { apiClient } from "@/lib/api/client";
 *   import { API_ROUTES } from "@/lib/constants/routes";
 *
 *   const data = await apiClient.get(API_ROUTES.CLIENTS);
 *   const result = await apiClient.post(API_ROUTES.AUTH.LOGIN, { email, password });
 */

import { fetcher } from "@/lib/fetcher";

type FetcherOptions = Omit<Parameters<typeof fetcher>[1], "body" | "method">;

export const apiClient = {
  get<T>(path: string, options?: FetcherOptions): Promise<T> {
    return fetcher<T>(path, { ...options, method: "GET" });
  },

  post<T>(path: string, body?: unknown, options?: FetcherOptions): Promise<T> {
    return fetcher<T>(path, { ...options, method: "POST", body });
  },

  patch<T>(path: string, body?: unknown, options?: FetcherOptions): Promise<T> {
    return fetcher<T>(path, { ...options, method: "PATCH", body });
  },

  put<T>(path: string, body?: unknown, options?: FetcherOptions): Promise<T> {
    return fetcher<T>(path, { ...options, method: "PUT", body });
  },

  delete<T>(path: string, options?: FetcherOptions): Promise<T> {
    return fetcher<T>(path, { ...options, method: "DELETE" });
  },
};
