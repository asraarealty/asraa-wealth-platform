import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

type SafeIntelligencePayload = {
  alerts: string[];
  diversification: Record<string, unknown> | null;
  risk: Record<string, unknown> | null;
  rebalance: Record<string, unknown> | null;
  [key: string]: unknown;
};

const SAFE_INTELLIGENCE: SafeIntelligencePayload = {
  alerts: [],
  diversification: null,
  risk: null,
  rebalance: null,
};

function unwrap(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  if (record.data && typeof record.data === "object" && "data" in (record.data as Record<string, unknown>)) {
    return (((record.data as Record<string, unknown>).data as Record<string, unknown>) ?? {});
  }
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function toSafeIntelligence(payload: unknown): SafeIntelligencePayload {
  const record = unwrap(payload);
  const alerts = Array.isArray(record.alerts)
    ? record.alerts.map((item) => (typeof item === "string" ? item : String((item as Record<string, unknown>)?.title ?? ""))).filter(Boolean)
    : [];

  const diversification = record.diversification && typeof record.diversification === "object" && !Array.isArray(record.diversification)
    ? (record.diversification as Record<string, unknown>)
    : null;
  const risk = record.risk && typeof record.risk === "object" && !Array.isArray(record.risk)
    ? (record.risk as Record<string, unknown>)
    : null;
  const rebalance = record.rebalance && typeof record.rebalance === "object" && !Array.isArray(record.rebalance)
    ? (record.rebalance as Record<string, unknown>)
    : null;

  return {
    ...record,
    alerts,
    diversification,
    risk,
    rebalance,
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const onboardingState = request.nextUrl.searchParams.get("onboarding_state");
  const url = new URL(`${BACKEND}/api/v2/intelligence`);
  if (onboardingState) url.searchParams.set("onboarding_state", onboardingState);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 422) {
        return NextResponse.json(SAFE_INTELLIGENCE, { status: 200 });
      }
      return NextResponse.json(SAFE_INTELLIGENCE, { status: 200 });
    }

    const json = await response.json().catch(() => ({}));
    return NextResponse.json(toSafeIntelligence(json), { status: 200 });
  } catch {
    return NextResponse.json(SAFE_INTELLIGENCE, { status: 200 });
  }
}
