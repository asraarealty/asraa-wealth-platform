import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_TOKEN = "asraa_token";
const COOKIE_ROLE = "asraa_role_c";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_TOKEN)?.value ?? null;
  const role = request.cookies.get(COOKIE_ROLE)?.value ?? null;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  // Unauthenticated users cannot access protected routes.
  if ((isDashboard || isAdmin) && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only admins may access /admin routes.
  if (isAdmin && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals, static files, and images.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
