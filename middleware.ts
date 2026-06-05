import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedRoute } from "@/lib/auth/routeProtection";

const ACCESS_TOKEN_COOKIE = "access_token";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value.trim();
  if (accessToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/activity/:path*",
    "/admin/:path*",
    "/assets/:path*",
    "/business-connect/:path*",
    "/dashboard/:path*",
    "/discover/:path*",
    "/insights/:path*",
    "/intelligence/:path*",
    "/markets/:path*",
    "/mutual-funds/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/properties/:path*",
    "/real-estate/:path*",
    "/stocks/:path*",
    "/transactions/:path*",
    "/watchlist/:path*",
  ],
};
