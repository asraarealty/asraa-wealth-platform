/**
 * Auth utilities for HTTP-only cookie session management.
 *
 * Tokens are managed exclusively by the backend as HTTP-only cookies.
 * The frontend never reads or writes the tokens directly.
 * Use the API functions in lib/api.ts (getMe, logout) to interact with auth state.
 */

export interface TokenPayload {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * No-op. Token storage is managed by the backend via HTTP-only cookies.
 * Call the logout() API function to end a session instead.
 */
export function clearAuth(): void {
  // Intentionally empty — HTTP-only cookies can only be cleared by the
  // backend via Set-Cookie on POST /api/v2/auth/logout.
}

