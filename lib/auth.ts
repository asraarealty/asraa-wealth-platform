/**
 * Auth utilities (wrapper layer)
 * Keep this thin — do NOT duplicate logic from fetcher
 */

import { getStoredToken, storeToken, clearToken } from "./fetcher";

/** Get current token */
export function getToken(): string | null {
  return getStoredToken();
}

/** Save token after login */
export function setToken(token: string): void {
  storeToken(token);
}

/** Clear auth (logout) */
export function clearAuth(): void {
  clearToken();
}
