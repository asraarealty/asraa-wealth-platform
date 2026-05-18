import { NextRequest, NextResponse } from "next/server";
import { normalizeIntelligencePayload } from "@/domains/intelligence";

const BACKEND = (process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

const SAFE_INTELLIGENCE = {
  aiInsights: [],
  trendAnalysis: [],
  riskAlerts: [],
  opportunities: [],
  macroSummary: "",
  portfolioIntelligence: [],
  allocationRecommendations: [],
  marketSentiment: "Neutral",
  degradedState: "Intelligence degraded",
};

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
      return NextResponse.json(SAFE_INTELLIGENCE, { status: 200 });
    }

    const json = await response.json().catch(() => ({}));
    return NextResponse.json(normalizeIntelligencePayload(json), { status: 200 });
  } catch {
    return NextResponse.json(SAFE_INTELLIGENCE, { status: 200 });
  }
}
