import { NextRequest, NextResponse } from "next/server";
import { getAllowedOrigins } from "./env";

export function getRequestIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function withCors(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  const allowed = getAllowedOrigins();

  if (origin && allowed.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept");
  return response;
}

export function apiError(
  request: NextRequest,
  status: number,
  code: string,
  message = "Request failed"
): NextResponse {
  return withCors(
    NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
        },
      },
      { status }
    ),
    request
  );
}

export function apiOk<T>(request: NextRequest, data: T, status = 200): NextResponse {
  if (status === 204) {
    return withCors(new NextResponse(null, { status: 204 }), request);
  }
  return withCors(NextResponse.json({ success: true, data }, { status }), request);
}
