"use client";

import { useMemo } from "react";
import { toErrorMessage } from "@/lib/fetcher";
import type { MarketAsset, SectorMover } from "@/lib/services/marketOrchestrator";
import { useIntelligencePipelineQuery } from "@/domains/intelligence";

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

const CONVICTION_BASE_SCORE = 58;
const CONVICTION_MIN_SCORE = 35;
const CONVICTION_MAX_SCORE = 97;
const CONVICTION_MOMENTUM_WEIGHT = 3;
const CONVICTION_SECTOR_LEADERSHIP_WEIGHT = 4;
const CONVICTION_LIQUIDITY_THRESHOLD = 1_000_000;
const CONVICTION_LIQUIDITY_BONUS = 6;
const CONVICTION_LIQUIDITY_BASELINE = 2;

const PORTFOLIO_FIT_BASE_SCORE = 52;
const PORTFOLIO_FIT_MIN_SCORE = 45;
const PORTFOLIO_FIT_MAX_SCORE = 94;
const PORTFOLIO_FIT_POSITIVE_MOMENTUM_BONUS = 10;
const PORTFOLIO_FIT_NEUTRAL_MOMENTUM_BONUS = 3;
const PORTFOLIO_FIT_OPPORTUNITY_BONUS = 10;
const PORTFOLIO_FIT_BALANCED_CONCENTRATION_BONUS = 8;
const PORTFOLIO_FIT_MODERATE_CONCENTRATION_BONUS = 3;
const PORTFOLIO_FIT_ELEVATED_CONCENTRATION_PENALTY = -4;

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

export function scoreAssetConviction(changePercent: number, sectorRank: number, volume: number): number {
  return Math.max(
    CONVICTION_MIN_SCORE,
    Math.min(
      CONVICTION_MAX_SCORE,
      Math.round(
        CONVICTION_BASE_SCORE +
          changePercent * CONVICTION_MOMENTUM_WEIGHT +
          Math.max(0, 6 - sectorRank) * CONVICTION_SECTOR_LEADERSHIP_WEIGHT +
          (volume > CONVICTION_LIQUIDITY_THRESHOLD ? CONVICTION_LIQUIDITY_BONUS : CONVICTION_LIQUIDITY_BASELINE)
      )
    )
  );
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

  const conviction = scoreAssetConviction(selectedAsset.changePercent, sectorRank, selectedAsset.volume);

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
    PORTFOLIO_FIT_MIN_SCORE,
    Math.min(
      PORTFOLIO_FIT_MAX_SCORE,
      Math.round(
        PORTFOLIO_FIT_BASE_SCORE +
          (selectedAsset.changePercent > 0
            ? PORTFOLIO_FIT_POSITIVE_MOMENTUM_BONUS
            : PORTFOLIO_FIT_NEUTRAL_MOMENTUM_BONUS) +
          (opportunities.some((item) => item.toLowerCase().includes(selectedAsset.symbol.toLowerCase()))
            ? PORTFOLIO_FIT_OPPORTUNITY_BONUS
            : 0) +
          (concentrationRisk === "Balanced"
            ? PORTFOLIO_FIT_BALANCED_CONCENTRATION_BONUS
            : concentrationRisk === "Moderate"
            ? PORTFOLIO_FIT_MODERATE_CONCENTRATION_BONUS
            : PORTFOLIO_FIT_ELEVATED_CONCENTRATION_PENALTY)
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
      tone:
        accumulation.toLowerCase().includes("accumulation")
          ? "success"
          : accumulation.toLowerCase().includes("distribution")
          ? "danger"
          : "info",
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
  const query = useIntelligencePipelineQuery();

  const data: IntelligencePayload = {
    aiInsights: query.data?.aiInsights ?? [],
    trendAnalysis: query.data?.trendAnalysis ?? [],
    riskAlerts: query.data?.riskAlerts ?? [],
    opportunities: query.data?.opportunities ?? [],
    macroSummary: query.data?.macroSummary ?? "Macroeconomic intelligence stream initializing.",
    portfolioIntelligence: query.data?.portfolioIntelligence ?? [],
    allocationRecommendations: query.data?.allocationRecommendations ?? [],
    marketSentiment: query.data?.marketSentiment ?? "Neutral",
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
    errorMessage: query.error
      ? toErrorMessage(query.error)
      : (query.data?.degradedState ?? null),
  };
}
