import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityEnv, isProduction } from "@/lib/security/env";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { getRequestIp } from "@/lib/security/api";

// Name of the HTTP-only cookie set by the backend on successful login.
const ACCESS_TOKEN_COOKIE = "access_token";
const IDLE_SESSION_COOKIE = "__Host-asraa_idle";

function buildCsp(): string {
  const production = isProduction();
  const scriptSources = production
    ? "'self' https:"
    : "'self' 'unsafe-inline' 'unsafe-eval' https: http:";
  const styleSources = production
    ? "'self' 'unsafe-inline' https:"
    : "'self' 'unsafe-inline' https: http:";
  const connectSources = production
    ? "'self' https:"
    : "'self' https: http: ws: wss:";
  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    `style-src ${styleSources}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    `connect-src ${connectSources}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Forces HTTPS on supported browsers.
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // Restricts script/style/image/network sources to reduce XSS and data injection risk.
  response.headers.set("Content-Security-Policy", buildCsp());
  // Prevents clickjacking via iframe embedding.
  response.headers.set("X-Frame-Options", "DENY");
  // Disables MIME sniffing to prevent content-type confusion.
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Limits referrer leakage across origins.
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Disables unnecessary browser features.
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Ensures resources are same-origin by default.
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  // Isolates top-level browsing context from cross-origin windows.
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return response;
}

export function proxy(request: NextRequest) {
  const env = getSecurityEnv();
  const { pathname } = request.nextUrl;

  const hasToken =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value !== undefined;
  const idleCookie = request.cookies.get(IDLE_SESSION_COOKIE)?.value;
  const ip = getRequestIp(request);

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isProtectedRoute = isDashboard || isAdmin;
  const isLoginAttempt = pathname === "/auth/login" && request.method === "POST";

  if (isLoginAttempt) {
    const loginLimit = checkRateLimit(
      `login:${ip}`,
      env.SECURITY_LOGIN_RATE_LIMIT_MAX,
      env.SECURITY_LOGIN_RATE_LIMIT_WINDOW_MS
    );
    if (!loginLimit.allowed) {
      const response = NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many login attempts" } },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(loginLimit.retryAfterSeconds));
      return applySecurityHeaders(response);
    }
    // Placeholder: persistent account lockout should be enforced in backend storage.
  }

  // Unauthenticated users cannot access protected routes.
  if (isProtectedRoute && !hasToken) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  const response = NextResponse.next();

  // Idle timeout cookie is HTTP-only and strict to reduce XSS/session fixation risk.
  if (isProtectedRoute && hasToken) {
    response.cookies.set(IDLE_SESSION_COOKIE, idleCookie || `session-init-${Date.now()}`, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction(),
      maxAge: env.SECURITY_IDLE_TIMEOUT_SECONDS,
      path: "/",
    });
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals, static files, and images.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
