const TOKEN_KEY = "asraa_jwt";
const ROLE_KEY = "asraa_role";
const COOKIE_TOKEN = "asraa_token";
const COOKIE_ROLE = "asraa_role_c";

// ── Cookie helpers (client-side only) ────────────────────────────────────────

function setCookie(name: string, value: string, maxAgeSec = 7 * 86400): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export interface TokenPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decode the JWT payload section of an arbitrary token string without
 * verifying the signature. Returns null if the token is malformed.
 */
function parseTokenPayload(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Decode the JWT payload section without verifying the signature.
 * Returns null if the token is missing or malformed.
 */
export function getTokenPayload(): TokenPayload | null {
  const token = getRawToken();
  if (!token) return null;
  return parseTokenPayload(token);
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

// ── Role helpers ──────────────────────────────────────────────────────────────

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

// ── Combined auth helpers ─────────────────────────────────────────────────────

/** Persist token + role in localStorage and cookies (for proxy route protection). */
export function setAuth(token: string, role: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  // Set cookies so the server-side proxy can read them for route protection.
  const payload = parseTokenPayload(token);
  const maxAge = payload?.exp
    ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
    : 7 * 86400;
  setCookie(COOKIE_TOKEN, token, maxAge);
  setCookie(COOKIE_ROLE, role, maxAge);
}

/** Read current auth state (token + role). */
export function getAuth(): { token: string | null; role: string | null } {
  return { token: getToken(), role: getRole() };
}

/** Clear all auth state (localStorage + cookies). */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  deleteCookie(COOKIE_TOKEN);
  deleteCookie(COOKIE_ROLE);
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

