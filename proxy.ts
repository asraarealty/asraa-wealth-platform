import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Name of the HTTP-only cookie set by the backend on successful login.
const ACCESS_TOKEN_COOKIE = "access_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasToken =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value !== undefined;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  // Unauthenticated users cannot access protected routes.
  if ((isDashboard || isAdmin) && !hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role enforcement is handled by the backend — the proxy only gates
  // on token presence. A non-admin hitting /admin will receive a 403
  // from the API and the UI will surface that error appropriately.

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals, static files, and images.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};

