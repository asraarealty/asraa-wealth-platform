/**
 * Auth utilities for token management using ephemeral in-memory storage.
 * Session cookies remain the primary auth mechanism.
 */

import { getToken, setToken, clearToken } from "./fetcher";

/** Get current token */
export function getStoredToken(): string | null {
  return getToken();
}

/** Save token */
export function storeToken(token: string): void {
  setToken(token);
}

/** Clear token */
export function clearAuth(): void {
  clearToken();
}
