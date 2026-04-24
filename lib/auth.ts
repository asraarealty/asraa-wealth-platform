/**
 * Auth utilities for localStorage-based token management.
 *
 * The access token is stored in localStorage and mirrored to a readable
 * cookie so the server-side proxy (proxy.ts) can gate protected routes.
 * Use the helpers in lib/fetcher.ts (storeToken, clearToken, getStoredToken)
 * for low-level token operations, or the AuthContext for higher-level auth state.
 */

export { getStoredToken, storeToken, clearToken } from "./fetcher";
import { clearToken } from "./fetcher";

/** Clear the stored auth token from localStorage and cookie. */
export function clearAuth(): void {
  clearToken();
}

