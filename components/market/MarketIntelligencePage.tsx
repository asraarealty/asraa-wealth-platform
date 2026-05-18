"use client";

import { useQuery } from "@tanstack/react-query";
import { AllocationRing } from "@/components/admin/platform/AllocationRing";
import { IntelligenceCard, LoadingBlock, MetricTile, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { fetcher, toErrorMessage } from "@/lib/fetcher";
import { useMarketOrchestrator } from "@/lib/services/marketOrchestrator";

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

export function MarketIntelligencePage() {
  const { trendingAssets, topGainers, sectorMovers } = useMarketOrchestrator();
  const query = useQuery({
    queryKey: ["market-intelligence"],
    queryFn: fetchIntelligence,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });
  const showSkeleton = query.isLoading && !query.data;

  const data = query.data ?? {
    aiInsights: [],
    trendAnalysis: [],
    riskAlerts: [],
    opportunities: [],
    macroSummary: "Macroeconomic intelligence stream initializing.",
    portfolioIntelligence: [],
    allocationRecommendations: [],
    marketSentiment: "Neutral",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Private wealth intelligence"
          title="Bloomberg-style market intelligence layer"
          subtitle="AI insights, macro signal extraction, allocation guidance, and sentiment overlays for the wealth operating system."
        />
        {query.error ? (
          <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {toErrorMessage(query.error)}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Market sentiment" value={data.marketSentiment} sub="AI + live market blend" />
          <MetricTile label="Trend clusters" value={String(data.trendAnalysis.length)} sub="Detected regime changes" />
          <MetricTile label="Risk alerts" value={String(data.riskAlerts.length)} sub="Portfolio and market stress" />
          <MetricTile label="Asset opportunities" value={String(data.opportunities.length)} sub="Tactical and strategic ideas" />
          {showSkeleton ? <LoadingBlock label="Loading intelligence metrics..." /> : null}
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Macroeconomic summary" title="Executive macro tape" subtitle="Institutional-grade market narrative" />
          <p className="mt-4 text-sm leading-7 text-slate-300">{data.macroSummary || "Macro feed is stabilizing while intelligence models collect fresh signals."}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.aiInsights.slice(0, 6).map((insight) => (
              <IntelligenceCard key={insight.title} title={insight.title} message={insight.message} confidence={typeof insight.confidence === "number" && insight.confidence > 0 ? insight.confidence : undefined} tone="info" />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Allocation recommendations" title="Model portfolio stance" subtitle="Target mix from intelligence engine" />
          <div className="mt-4">
            <AllocationRing
              segments={data.allocationRecommendations.length > 0 ? data.allocationRecommendations.map((item, index) => ({
                label: item.label,
                value: item.value,
                color: ["#38bdf8", "#818cf8", "#22c55e", "#f59e0b", "#f472b6"][index % 5],
              })) : [
                { label: "Equity", value: 45, color: "#38bdf8" },
                { label: "Funds", value: 25, color: "#818cf8" },
                { label: "Alternatives", value: 20, color: "#22c55e" },
                { label: "Hedges", value: 10, color: "#f59e0b" },
              ]}
            />
          </div>
          <div className="mt-4 space-y-3">
            {data.allocationRecommendations.slice(0, 5).map((item) => (
              <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-blue-300">{item.value.toFixed(1)}%</p>
                </div>
                {item.rationale ? <p className="mt-1 text-xs text-slate-500">{item.rationale}</p> : null}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Trend analysis" title="Emerging regimes" subtitle="Where leadership is rotating" />
          <div className="mt-4 space-y-3">
            {(data.trendAnalysis.length > 0 ? data.trendAnalysis : sectorMovers.map((item) => `${item.sector} moving ${item.avgChangePercent >= 0 ? "up" : "down"} ${Math.abs(item.avgChangePercent).toFixed(2)}%`)).slice(0, 6).map((item) => (
              <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Risk alerts" title="Stress radar" subtitle="Actionable risk warnings" />
          <div className="mt-4 space-y-3">
            {(data.riskAlerts.length > 0 ? data.riskAlerts : topGainers.slice(0, 5).map((item) => `${item.symbol} volatility has expanded to ${Math.abs(item.changePercent).toFixed(2)}%.`)).slice(0, 6).map((item) => (
              <div key={item} className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Opportunities" title="Opportunity ledger" subtitle="Potential allocation upgrades" />
          <div className="mt-4 space-y-3">
            {(data.opportunities.length > 0 ? data.opportunities : trendingAssets.slice(0, 5).map((item) => `${item.name} is trending in ${item.market} with ${item.changePercent >= 0 ? "positive" : "negative"} momentum.`)).slice(0, 6).map((item) => (
              <div key={item} className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Portfolio intelligence" title="Advisory overlays" subtitle="Signals mapped to client portfolios" />
          <div className="mt-4 space-y-3">
            {(data.portfolioIntelligence.length > 0 ? data.portfolioIntelligence : [
              "Blend global growth with domestic quality to keep the opportunity set diversified.",
              "Maintain a visible gold hedge while inflation volatility remains elevated.",
              "Use mutual funds and ETFs as tactical sleeves to rebalance without liquidity drag.",
            ]).map((item) => (
              <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="Live leaders" title="Market sentiment anchors" subtitle="Realtime winners informing the AI tape" />
          <div className="mt-4 space-y-3">
            {topGainers.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.symbol}</p>
                  <p className="text-xs text-slate-500">{item.name}</p>
                </div>
                <p className="text-xs text-emerald-400">{item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
