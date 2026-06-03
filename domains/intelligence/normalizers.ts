import { fetcher, toErrorMessage } from "@/lib/fetcher";
import { fetchInsights } from "@/lib/api";
import type { InsightsResponse } from "@/lib/api";
import { parseIntelligencePipelineDto } from "./contracts";

interface IntelligenceResearchSections {
  financials: string[];
  ownership: string[];
  filings: string[];
  news: string[];
  aiResearch: string[];
}

interface IntelligenceSymbolResearch {
  symbol: string;
  sections: IntelligenceResearchSections;
}

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
  research: {
    default: IntelligenceResearchSections;
    bySymbol: IntelligenceSymbolResearch[];
  };
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
  research: {
    default: {
      financials: [],
      ownership: [],
      filings: [],
      news: [],
      aiResearch: [],
    },
    bySymbol: [],
  },
};

const RESEARCH_FALLBACK_KEYS = ["items", "list", "results", "entries", "data", "articles", "signals", "insights"] as const;

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

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

function normalizeTickerSymbol(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/(NSE|BSE|NS|BO)$/g, "");
}

function textFromEntry(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (value === null || value === undefined) return [];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(textFromEntry);

  const record = safeRecord(value);
  const headline = asText(record.headline ?? record.title ?? record.name).trim();
  const message = asText(
    record.message ?? record.summary ?? record.description ?? record.insight ?? record.analysis ?? record.text ?? record.content
  ).trim();
  const combined = [headline, message].filter(Boolean).join(": ").trim();
  if (combined) return [combined];

  for (const key of RESEARCH_FALLBACK_KEYS) {
    const extracted = textFromEntry(record[key]);
    if (extracted.length > 0) return extracted;
  }

  return [];
}

function uniqueText(entries: string[]) {
  return [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))];
}

function sectionFromRecord(record: Record<string, unknown>, keys: string[]): string[] {
  return uniqueText(keys.flatMap((key) => textFromEntry(record[key])));
}

function buildResearchSections(record: Record<string, unknown>): IntelligenceResearchSections {
  return {
    financials: sectionFromRecord(record, [
      "financials",
      "financial",
      "fundamentals",
      "fundamentalAnalysis",
      "fundamental_analysis",
      "company_financials",
    ]),
    ownership: sectionFromRecord(record, [
      "ownership",
      "shareholding",
      "share_holding",
      "institutionalOwnership",
      "institutional_ownership",
      "promoter_holding",
    ]),
    filings: sectionFromRecord(record, ["filings", "regulatoryFilings", "regulatory_filings", "sec_filings", "disclosures"]),
    news: sectionFromRecord(record, ["news", "latestNews", "latest_news", "marketNews", "market_news", "headlines"]),
    aiResearch: sectionFromRecord(record, ["aiResearch", "ai_research", "research", "equityResearch", "equity_research", "analysis"]),
  };
}

function hasResearchContent(sections: IntelligenceResearchSections) {
  return Object.values(sections).some((entries) => entries.length > 0);
}

function extractSymbolResearch(source: Record<string, unknown>): IntelligenceSymbolResearch[] {
  const candidates = source.symbolResearch ?? source.symbol_research ?? source.researchBySymbol ?? source.research_by_symbol;
  if (!candidates) return [];

  const fromObject = !Array.isArray(candidates) ? safeRecord(candidates) : null;
  if (fromObject) {
    return Object.entries(fromObject)
      .map(([symbol, value]) => ({ symbol, sections: buildResearchSections(safeRecord(value)) }))
      .filter((entry) => normalizeTickerSymbol(entry.symbol) && hasResearchContent(entry.sections));
  }

  return asArray<Record<string, unknown>>(candidates)
    .map((entry) => {
      const symbol = asText(entry.symbol ?? entry.ticker ?? entry.assetSymbol ?? entry.asset_symbol).trim();
      return { symbol, sections: buildResearchSections(entry) };
    })
    .filter((entry) => normalizeTickerSymbol(entry.symbol) && hasResearchContent(entry.sections));
}

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

  const researchContainer = safeRecord(
    record.research ?? record.research_data ?? record.market_research ?? record.equity_research
  );
  const baseResearchSections = buildResearchSections(researchContainer);
  const rootResearchSections = buildResearchSections(record);
  const defaultResearch = hasResearchContent(baseResearchSections) ? baseResearchSections : rootResearchSections;
  const symbolResearch = [
    ...extractSymbolResearch(researchContainer),
    ...extractSymbolResearch(record),
  ].filter(
    (entry, index, list) =>
      list.findIndex(
        (current) => normalizeTickerSymbol(current.symbol) === normalizeTickerSymbol(entry.symbol)
      ) === index
  );

  return parseIntelligencePipelineDto({
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
    research: {
      default: defaultResearch,
      bySymbol: symbolResearch,
    },
  });
}

export function parseCanonicalIntelligencePayload(payload: unknown): IntelligencePipelineData {
  return parseIntelligencePipelineDto(payload);
}

export async function fetchIntelligencePipeline(signal?: AbortSignal): Promise<IntelligencePipelineData> {
  try {
    const payload = await fetcher<unknown>("/intelligence", { raw: true, noRedirectOn401: true, signal });
    return parseCanonicalIntelligencePayload(payload);
  } catch (error) {
    return {
      ...EMPTY_INTELLIGENCE,
      degradedState: `Intelligence degraded: ${toErrorMessage(error)}`,
    };
  }
}

export async function fetchClientIntelligence(clientId: number, signal?: AbortSignal): Promise<ClientIntelligenceData> {
  try {
    const insights = await fetchInsights(clientId, signal);
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.info("[domain-query]", {
        stage: "client-intelligence",
        clientId,
        normalizedEntityCount: Array.isArray(insights?.alerts) ? insights.alerts.length : 0,
        degraded: false,
      });
    }
    return { insights: insights ?? null, degradedState: null };
  } catch (error) {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.info("[domain-query]", {
        stage: "client-intelligence",
        clientId,
        normalizedEntityCount: 0,
        degraded: true,
        reason: toErrorMessage(error),
      });
    }
    return {
      insights: null,
      degradedState: `Client intelligence unavailable: ${toErrorMessage(error)}`,
    };
  }
}

export { EMPTY_INTELLIGENCE };
