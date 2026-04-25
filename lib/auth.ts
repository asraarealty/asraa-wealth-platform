/**
 * Auth utilities for token management using localStorage.
 * This file is aligned with the token-based fetcher.
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
