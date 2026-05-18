import { fetcher, toErrorMessage } from "@/lib/fetcher";
import { fetchInsights } from "@/lib/api";
import { normalizeInsights } from "@/lib/api/normalizers";
import type { InsightsResponse } from "@/lib/api";

export interface IntelligencePipelineData {
  aiInsights: Array<{ title: string; message: string; confidence?: number }>;
  trendAnalysis: string[];
  riskAlerts: string[];
  opportunities: string[];
  macroSummary: string;
  portfolioIntelligence: string[];
  allocationRecommendations: Array<{ label: string; value: number; rationale?: string }>;
  marketSentiment: string;
  degradedState: string | null;
}

export interface ClientIntelligenceData {
  insights: InsightsResponse | null;
  degradedState: string | null;
}

const EMPTY_INTELLIGENCE: IntelligencePipelineData = {
  aiInsights: [],
  trendAnalysis: [],
  riskAlerts: [],
  opportunities: [],
  macroSummary: "Macroeconomic intelligence stream initializing.",
  portfolioIntelligence: [],
  allocationRecommendations: [],
  marketSentiment: "Neutral",
  degradedState: null,
};

function unwrap(value: unknown): unknown {
  const seen = new Set<unknown>();
  let current: unknown = value;
  while (current && typeof current === "object" && !Array.isArray(current)) {
    if (seen.has(current)) break;
    seen.add(current);
    const record = current as Record<string, unknown>;
    if (!("data" in record)) return current;
    current = record.data;
  }
  return current;
}

const asArray = <T,>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);
const asText = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

export function normalizeIntelligencePayload(payload: unknown): IntelligencePipelineData {
  const value = unwrap(payload);
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  const allocationRecommendations = asArray<Record<string, unknown>>(
    record.allocation_recommendations ?? record.allocationRecommendations
  ).map((item, index) => ({
    label: asText(item.label ?? item.asset_class, `Recommendation ${index + 1}`),
    value: Number(item.value ?? item.weight ?? item.percentage ?? 0),
    rationale: asText(item.rationale ?? item.message),
  }));

  return {
    aiInsights: asArray<Record<string, unknown>>(record.ai_market_insights ?? record.aiInsights ?? record.insights).map(
      (item, index) => ({
        title: asText(item.title, `Insight ${index + 1}`),
        message: asText(item.message ?? item.body, asText(item, "")),
        confidence: Number(item.confidence ?? 0),
      })
    ),
    trendAnalysis: asArray(record.trend_analysis ?? record.trends).map((item) => asText(item)).filter(Boolean),
    riskAlerts: asArray(record.risk_alerts ?? record.alerts).map((item) => asText(item)).filter(Boolean),
    opportunities: asArray(record.asset_opportunities ?? record.opportunities).map((item) => asText(item)).filter(Boolean),
    macroSummary: asText(record.macroeconomic_summary ?? record.macro_summary ?? record.summary, EMPTY_INTELLIGENCE.macroSummary),
    portfolioIntelligence: asArray(record.portfolio_intelligence ?? record.portfolioSignals).map((item) => asText(item)).filter(Boolean),
    allocationRecommendations,
    marketSentiment: asText(record.market_sentiment ?? record.sentiment, "Neutral to constructive"),
    degradedState: null,
  };
}

export async function fetchIntelligencePipeline(signal?: AbortSignal): Promise<IntelligencePipelineData> {
  try {
    const payload = await fetcher<unknown>("/intelligence", { raw: true, noRedirectOn401: true, signal });
    return normalizeIntelligencePayload(payload);
  } catch (error) {
    return {
      ...EMPTY_INTELLIGENCE,
      degradedState: `Intelligence degraded: ${toErrorMessage(error)}`,
    };
  }
}

export async function fetchClientIntelligence(clientId: number, signal?: AbortSignal): Promise<ClientIntelligenceData> {
  try {
    const insights = normalizeInsights(await fetchInsights(clientId, signal));
    return { insights: insights ?? null, degradedState: null };
  } catch (error) {
    return {
      insights: null,
      degradedState: `Client intelligence unavailable: ${toErrorMessage(error)}`,
    };
  }
}

export { EMPTY_INTELLIGENCE };
