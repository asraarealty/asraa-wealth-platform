"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher, toErrorMessage } from "@/lib/fetcher";
import type { MarketAsset, SectorMover } from "@/lib/services/marketOrchestrator";
import { useAuth } from "@/context/AuthContext";

interface IntelligencePayload {
  aiInsights: Array<{ title: string; message: string; confidence?: number }>;
  trendAnalysis: string[];
  riskAlerts: string[];
  opportunities: string[];
  macroSummary: string;
  portfolioIntelligence: string[];
  allocationRecommendations: Array<{ label: string; value: number; rationale?: string }>;
  marketSentiment: string;
}

export interface ProprietarySignal {
  key:
    | "convictionScore"
    | "momentumStrength"
    | "sectorLeadership"
    | "accumulationDistribution"
    | "valuationPressure"
    | "macroSensitivity"
    | "liquidityProfile"
    | "concentrationRisk"
    | "portfolioFit";
  label: string;
  value: string;
  tone: "info" | "success" | "warn" | "danger";
}

function unwrap(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (record.data && typeof record.data === "object" && "data" in (record.data as Record<string, unknown>)) {
    return (record.data as Record<string, unknown>).data;
  }
  if ("data" in record) return record.data;
  return value;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

async function fetchIntelligence(): Promise<IntelligencePayload> {
  const payload = unwrap(await fetcher<unknown>("/intelligence", { raw: true, cache: "no-store", noRedirectOn401: true }));
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};

  const allocation = asArray(record.allocation_recommendations ?? record.allocationRecommendations).map((item, index) => {
    const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      label: asText(entry.label ?? entry.asset_class, `Recommendation ${index + 1}`),
      value: Number(entry.value ?? entry.weight ?? entry.percentage ?? 0),
      rationale: asText(entry.rationale ?? entry.message),
    };
  });

  return {
    aiInsights: asArray(record.ai_market_insights ?? record.aiInsights ?? record.insights).map((item, index) => {
      const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        title: asText(entry.title, `Insight ${index + 1}`),
        message: asText(entry.message ?? entry.body, asText(item, "")),
        confidence: Number(entry.confidence ?? 0),
      };
    }),
    trendAnalysis: asArray(record.trend_analysis ?? record.trends).map((item) => asText(item)).filter(Boolean),
    riskAlerts: asArray(record.risk_alerts ?? record.alerts).map((item) => asText(item)).filter(Boolean),
    opportunities: asArray(record.asset_opportunities ?? record.opportunities).map((item) => asText(item)).filter(Boolean),
    macroSummary: asText(record.macroeconomic_summary ?? record.macro_summary ?? record.summary),
    portfolioIntelligence: asArray(record.portfolio_intelligence ?? record.portfolioSignals).map((item) => asText(item)).filter(Boolean),
    allocationRecommendations: allocation,
    marketSentiment: asText(record.market_sentiment ?? record.sentiment, "Neutral to constructive"),
  };
}

function liquidityTone(volume: number): ProprietarySignal["tone"] {
  if (volume > 4_000_000) return "success";
  if (volume > 1_000_000) return "info";
  if (volume > 250_000) return "warn";
  return "danger";
}

function rankForSector(sectorMovers: SectorMover[], sector: string): number {
  const index = sectorMovers.findIndex((item) => item.sector.toLowerCase() === sector.toLowerCase());
  return index < 0 ? sectorMovers.length + 1 : index + 1;
}

export function buildProprietarySignals(
  selectedAsset: MarketAsset | null,
  sectorMovers: SectorMover[],
  watchlist: MarketAsset[],
  opportunities: string[]
): ProprietarySignal[] {
  if (!selectedAsset) {
    return [
      { key: "convictionScore", label: "Conviction Score", value: "—", tone: "info" },
      { key: "momentumStrength", label: "Momentum Strength", value: "Awaiting asset selection", tone: "info" },
      { key: "sectorLeadership", label: "Sector Leadership", value: "Select an asset", tone: "info" },
      { key: "accumulationDistribution", label: "Accumulation/Distribution", value: "Select an asset", tone: "info" },
      { key: "valuationPressure", label: "Valuation Pressure", value: "Select an asset", tone: "info" },
      { key: "macroSensitivity", label: "Macro Sensitivity", value: "Select an asset", tone: "info" },
      { key: "liquidityProfile", label: "Liquidity Profile", value: "Select an asset", tone: "info" },
      { key: "concentrationRisk", label: "Concentration Risk", value: "Select an asset", tone: "info" },
      { key: "portfolioFit", label: "Portfolio Fit", value: "Select an asset", tone: "info" },
    ];
  }

  const sectorRank = rankForSector(sectorMovers, selectedAsset.sector);
  const leadership =
    sectorRank <= 2
      ? "Leadership tier"
      : sectorRank <= 4
      ? "Upper rotation"
      : "Secondary rotation";

  const watchlistWeight = watchlist.filter((item) => item.sector === selectedAsset.sector).length;
  const concentrationRisk =
    watchlistWeight >= 3 ? "Elevated" : watchlistWeight === 2 ? "Moderate" : "Balanced";

  const conviction = Math.max(
    35,
    Math.min(
      97,
      Math.round(
        58 +
          selectedAsset.changePercent * 3 +
          Math.max(0, 6 - sectorRank) * 4 +
          (selectedAsset.volume > 1_000_000 ? 6 : 2)
      )
    )
  );

  const accumulation =
    selectedAsset.changePercent >= 1.5
      ? "Institutional accumulation"
      : selectedAsset.changePercent <= -1
      ? "Distribution pressure"
      : "Balanced flows";

  const valuationPressure =
    Math.abs(selectedAsset.changePercent) >= 3
      ? "High price discovery"
      : Math.abs(selectedAsset.changePercent) >= 1.5
      ? "Moderate repricing"
      : "Contained";

  const macroSensitivity =
    selectedAsset.market === "Macro" || selectedAsset.market === "Commodity"
      ? "High"
      : selectedAsset.market === "Global"
      ? "Medium"
      : "Low";

  const fitScore = Math.max(
    45,
    Math.min(
      94,
      Math.round(
        52 +
          (selectedAsset.changePercent > 0 ? 10 : 3) +
          (opportunities.some((item) => item.toLowerCase().includes(selectedAsset.symbol.toLowerCase())) ? 10 : 0) +
          (concentrationRisk === "Balanced" ? 8 : concentrationRisk === "Moderate" ? 3 : -4)
      )
    )
  );

  return [
    {
      key: "convictionScore",
      label: "Conviction Score",
      value: `${conviction}/100`,
      tone: conviction >= 80 ? "success" : conviction >= 65 ? "info" : "warn",
    },
    {
      key: "momentumStrength",
      label: "Momentum Strength",
      value: `${selectedAsset.changePercent >= 0 ? "+" : ""}${selectedAsset.changePercent.toFixed(2)}%`,
      tone: selectedAsset.changePercent >= 0 ? "success" : "danger",
    },
    {
      key: "sectorLeadership",
      label: "Sector Leadership",
      value: `${leadership} (#${sectorRank})`,
      tone: sectorRank <= 2 ? "success" : sectorRank <= 4 ? "info" : "warn",
    },
    {
      key: "accumulationDistribution",
      label: "Accumulation/Distribution",
      value: accumulation,
      tone: accumulation.includes("accumulation") ? "success" : accumulation.includes("Distribution") ? "danger" : "info",
    },
    {
      key: "valuationPressure",
      label: "Valuation Pressure",
      value: valuationPressure,
      tone: valuationPressure === "High price discovery" ? "warn" : "info",
    },
    {
      key: "macroSensitivity",
      label: "Macro Sensitivity",
      value: macroSensitivity,
      tone: macroSensitivity === "High" ? "warn" : macroSensitivity === "Medium" ? "info" : "success",
    },
    {
      key: "liquidityProfile",
      label: "Liquidity Profile",
      value: selectedAsset.volume > 0 ? `${Math.round(selectedAsset.volume / 1000)}k volume` : "Thin liquidity",
      tone: liquidityTone(selectedAsset.volume),
    },
    {
      key: "concentrationRisk",
      label: "Concentration Risk",
      value: concentrationRisk,
      tone: concentrationRisk === "Elevated" ? "danger" : concentrationRisk === "Moderate" ? "warn" : "success",
    },
    {
      key: "portfolioFit",
      label: "Portfolio Fit",
      value: `${fitScore}/100`,
      tone: fitScore >= 80 ? "success" : fitScore >= 65 ? "info" : "warn",
    },
  ];
}

export function useMarketIntelligenceEngine(selectedAsset: MarketAsset | null, sectorMovers: SectorMover[], watchlist: MarketAsset[]) {
  const { authReady, authenticated } = useAuth();
  const query = useQuery({
    queryKey: ["market-intelligence-engine"],
    queryFn: fetchIntelligence,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    enabled: authReady && authenticated,
  });

  const data: IntelligencePayload = query.data ?? {
    aiInsights: [],
    trendAnalysis: [],
    riskAlerts: [],
    opportunities: [],
    macroSummary: "Macroeconomic intelligence stream initializing.",
    portfolioIntelligence: [],
    allocationRecommendations: [],
    marketSentiment: "Neutral",
  };

  const proprietarySignals = useMemo(
    () => buildProprietarySignals(selectedAsset, sectorMovers, watchlist, data.opportunities),
    [selectedAsset, sectorMovers, watchlist, data.opportunities]
  );

  return {
    ...data,
    proprietarySignals,
    isLoading: query.isLoading && !query.data,
    isFetching: query.isFetching,
    errorMessage: query.error ? toErrorMessage(query.error) : null,
  };
}
