const TOKEN_KEY = "asraa_jwt";

export interface TokenPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decode the JWT payload section without verifying the signature.
 * Returns null if the token is missing or malformed.
 */
export function getTokenPayload(): TokenPayload | null {
  const token = getRawToken();
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    // Base64url → base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

function getRawToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getToken(): string | null {
  const token = getRawToken();
  if (!token) return null;

  // Treat an expired token as absent so callers don't send it to the API.
  const payload = getTokenPayload();
  if (payload?.exp !== undefined && payload.exp * 1000 < Date.now()) {
    removeToken();
    return null;
  }

  return token;
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Returns how many milliseconds until the stored token expires,
 * or 0 if there is no token / it is already expired.
 */
export function msUntilExpiry(): number {
  const payload = getTokenPayload();
  if (!payload?.exp) return 0;
  const remaining = payload.exp * 1000 - Date.now();
  return remaining > 0 ? remaining : 0;
}

