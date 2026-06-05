import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
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
