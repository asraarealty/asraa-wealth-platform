import { NextRequest, NextResponse } from "next/server";
import { apiError } from "./api";
import { getSecurityEnv } from "./env";

export type AuthContext = {
  token: string;
  authHeader: string;
};

type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse };

function parseBearerToken(value: string): string | null {
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function getAuthToken(request: NextRequest): string | null {
  const fromHeader = parseBearerToken(request.headers.get("authorization") ?? "");
  if (fromHeader) return fromHeader;

  const fromCookie = request.cookies.get("access_token")?.value?.trim();
  return fromCookie || null;
}

export function requireAuth(request: NextRequest): AuthResult {
  const token = getAuthToken(request);
  if (!token) {
    return { ok: false, response: apiError(request, 401, "UNAUTHORIZED", "Authentication is required") };
  }

  return { ok: true, context: { token, authHeader: `Bearer ${token}` } };
}

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return claims && typeof claims === "object" ? claims : null;
  } catch {
    return null;
  }
}

function claimsIncludeRole(claims: Record<string, unknown> | null, allowedRoles: string[]): boolean {
  if (!claims) return false;
  const role = claims.role;
  if (typeof role === "string" && allowedRoles.includes(role.toLowerCase())) return true;
  const roles = claims.roles;
  if (Array.isArray(roles)) {
    return roles.some((v) => typeof v === "string" && allowedRoles.includes(v.toLowerCase()));
  }
  return false;
}

async function backendAllowsRole(
  authHeader: string,
  allowedRoles: string[]
): Promise<boolean> {
  const backendBase = getSecurityEnv().BACKEND_URL;
  if (!backendBase) return false;
  const response = await fetch(`${backendBase}/api/v2/auth/me`, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return false;
  const payload = await response.json().catch(() => null);

  const role =
    payload?.data?.role ??
    payload?.role ??
    payload?.user?.role;
  return typeof role === "string" && allowedRoles.includes(role.toLowerCase());
}

export async function requireRole(
  request: NextRequest,
  auth: AuthContext,
  allowedRoles: string[]
): Promise<NextResponse | null> {
  const normalized = allowedRoles.map((r) => r.toLowerCase());
  const claims = decodeJwtClaims(auth.token);
  if (claimsIncludeRole(claims, normalized)) return null;

  if (await backendAllowsRole(auth.authHeader, normalized)) return null;

  return apiError(request, 403, "FORBIDDEN", "You are not authorized to perform this action");
}
