"use client";

import { useMemo } from "react";
import { IntelligenceCard, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { fmtPercent } from "@/lib/formatters";
import { useMarketDomainGraph, useMarketIntelligenceEngine } from "@/domains/market";

function SignalRow({
  index,
  text,
  tone,
}: {
  index: number;
  text: string;
  tone: "success" | "warn" | "info" | "danger";
}) {
  const dotColor: Record<typeof tone, string> = {
    success: "bg-emerald-400",
    warn: "bg-amber-400",
    info: "bg-sky-400",
    danger: "bg-rose-400",
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor[tone]}`} />
        {index < 3 ? <span className="w-px flex-1 bg-white/10" style={{ minHeight: 12 }} /> : null}
      </div>
      <p className="text-sm text-slate-300 leading-6">{text}</p>
    </div>
  );
}

function RiskConcentrationBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? "bg-rose-400" : pct >= 60 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[11px] font-semibold text-white">{value}</p>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function IntelligenceMissionControl() {
  const {
    assets,
    sectorMovers,
    watchlist,
    breadth,
    marketOverview,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();

  const intelligence = useMarketIntelligenceEngine(null, sectorMovers, watchlist);

  const allocationItems = useMemo(
    () =>
      intelligence.allocationRecommendations.length > 0
        ? intelligence.allocationRecommendations
        : [
            { label: "Equity — India Large Cap", value: 38, rationale: "Core allocation, defensive growth" },
            { label: "Equity — Global Tech", value: 22, rationale: "AI cycle exposure" },
            { label: "Fixed Income", value: 20, rationale: "Duration hedge against rate uncertainty" },
            { label: "Commodities", value: 12, rationale: "Inflation + supply risk buffer" },
            { label: "Cash & Equivalents", value: 8, rationale: "Liquidity reserve" },
          ],
    [intelligence.allocationRecommendations]
  );

  const portfolioSignals = useMemo(() => {
    const lines: Array<{ text: string; tone: "success" | "warn" | "info" | "danger" }> = [];

    if (intelligence.portfolioIntelligence.length > 0) {
      intelligence.portfolioIntelligence.slice(0, 6).forEach((line) => {
        lines.push({ text: line, tone: "info" });
      });
    } else if (intelligence.opportunities.length > 0) {
      intelligence.opportunities.slice(0, 6).forEach((line) => {
        lines.push({ text: line, tone: "info" });
      });
    }

    if (intelligence.riskAlerts.length > 0) {
      lines.push({ text: intelligence.riskAlerts[0], tone: "warn" });
    }

    if (lines.length === 0) {
      lines.push(
        { text: "Portfolio intelligence stream initializing.", tone: "info" },
        { text: "Connect live portfolio data to activate allocation shift detection.", tone: "info" }
      );
    }

    return lines;
  }, [intelligence]);

  const corrBullets = useMemo(
    () =>
      intelligence.trendAnalysis.length > 0
        ? intelligence.trendAnalysis
        : ["Correlation engine analyzing cross-asset relationships.", "Connect portfolio for live stress signals."],
    [intelligence.trendAnalysis]
  );

  const updatedAt = lastUpdated ? new Date(lastUpdated).toISOString().slice(11, 16) + " UTC" : null;

  return (
    <SurfaceCard className="p-0 overflow-hidden">
      {/* Mission control header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-rose-500/20">
            <span className="text-[9px] font-bold text-rose-300">AI</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-rose-400/80">Intelligence Mission Control</p>
            <p className="text-[11px] text-slate-500">
              AI OS · portfolio intelligence · risk · allocation
              {updatedAt ? ` · ${updatedAt}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error ? <span className="text-[10px] text-rose-400">Feed error</span> : null}
          {intelligence.isLoading ? <span className="text-[10px] text-slate-500">AI computing…</span> : null}
          <button type="button" className="v2-action text-[10px]" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-y-auto space-y-0">
        {/* Section 1: AI Strategic Summary — full width */}
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <SectionHeader
              eyebrow="AI Strategic Summary"
              title="Portfolio Macro Analysis"
              subtitle="Real-time intelligence synthesis across market, portfolio, and allocation state"
            />
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              intelligence.marketSentiment === "Bullish"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : intelligence.marketSentiment === "Bearish"
                ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
                : "border-slate-600 bg-white/[0.03] text-slate-400"
            }`}>
              {intelligence.marketSentiment}
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-sm leading-7 text-slate-300">{intelligence.macroSummary}</p>
          </div>
        </div>

        {/* Section 2: Portfolio pulse metrics */}
        <div className="border-b border-white/8 px-5 py-4">
          <SectionHeader title="Market Pulse" subtitle="Cross-asset breadth and activity metrics" />
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {marketOverview.slice(0, 6).map((m) => (
              <MetricTile
                key={m.label}
                label={m.label}
                value={m.value}
                change={m.delta}
                positive={m.tone === "success" ? true : m.tone === "warn" ? false : undefined}
              />
            ))}
            {isLoading && marketOverview.length === 0 ? (
              <p className="col-span-full text-xs text-slate-500">Loading…</p>
            ) : null}
          </div>
        </div>

        {/* Section 3: Signal stack — stacked intelligence feed */}
        <div className="border-b border-white/8 px-5 py-4">
          <SectionHeader
            title="Portfolio Signal Stack"
            subtitle="Active intelligence pipeline · allocation shifts · conviction transitions"
            action={
              <span className="text-[10px] text-slate-500">{portfolioSignals.length} signals</span>
            }
          />
          <div className="mt-3 space-y-2">
            {portfolioSignals.map(({ text, tone }, i) => (
              <SignalRow key={text} index={i} text={text} tone={tone} />
            ))}
          </div>
        </div>

        {/* Section 4: Risk alerts — critical first */}
        {intelligence.riskAlerts.length > 0 ? (
          <div className="border-b border-white/8 px-5 py-4">
            <SectionHeader
              eyebrow="Risk Engine"
              title="Active Risk Alerts"
              subtitle="Portfolio stress signals · macro warnings · concentration flags"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {intelligence.riskAlerts.map((alert, i) => (
                <div
                  key={alert}
                  className={`rounded-xl border px-4 py-3 ${
                    i === 0
                      ? "border-rose-400/25 bg-rose-500/10"
                      : "border-amber-400/20 bg-amber-500/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-rose-400" : "bg-amber-400"}`} />
                    <StatusPill label={i === 0 ? "CRITICAL" : "WARNING"} tone={i === 0 ? "danger" : "warn"} />
                  </div>
                  <p className={`text-xs leading-5 ${i === 0 ? "text-rose-200" : "text-amber-100/80"}`}>{alert}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Section 5: AI insights grid */}
        <div className="border-b border-white/8 px-5 py-4">
          <SectionHeader
            title="AI Intelligence Cards"
            subtitle="Active insights from portfolio + market intelligence pipeline"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {intelligence.aiInsights.length > 0 ? (
              intelligence.aiInsights.slice(0, 8).map((insight) => (
                <IntelligenceCard
                  key={insight.title}
                  title={insight.title}
                  message={insight.message}
                  confidence={insight.confidence}
                  tone="info"
                />
              ))
            ) : (
              <p className="col-span-full text-xs text-slate-500">AI intelligence stream initializing…</p>
            )}
          </div>
        </div>

        {/* Section 6: Allocation recommendations */}
        <div className="border-b border-white/8 px-5 py-4">
          <SectionHeader
            title="Allocation Recommendations"
            subtitle="AI-driven portfolio construction signals"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {allocationItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 space-y-2">
                <p className="text-xs font-semibold text-white">{item.label}</p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-sky-400 transition-all"
                      style={{ width: `${Math.min(100, item.value)}%` }}
                    />
                  </div>
                  <p className="shrink-0 text-xs font-bold text-sky-300">{item.value}%</p>
                </div>
                {item.rationale ? (
                  <p className="text-[10px] text-slate-500 leading-4">{item.rationale}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Correlation engine + portfolio impact matrix */}
        <div className="grid md:grid-cols-2 gap-0">
          <div className="border-r border-white/8 px-5 py-4">
            <SectionHeader
              title="Correlation Engine"
              subtitle="Cross-asset and sector relationship signals"
            />
            <div className="mt-3 space-y-1.5">
              {corrBullets.slice(0, 6).map((line) => (
                <div
                  key={line}
                  className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 leading-5"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <SectionHeader
              title="Breadth & Stress"
              subtitle="Market structure health indicators"
            />
            <div className="mt-3 space-y-3">
              <RiskConcentrationBar label="Advances" value={breadth.advances} max={Math.max(1, breadth.total)} />
              <RiskConcentrationBar label="Declines" value={breadth.declines} max={Math.max(1, breadth.total)} />
              <RiskConcentrationBar label="Market Pulse" value={breadth.marketPulse} max={100} />
              <RiskConcentrationBar label="Liquidity Rotation" value={breadth.liquidityRotation} max={100} />
            </div>

            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 mb-2">Portfolio Impact Matrix</p>
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label="Total Symbols" value={String(assets.length)} />
                <MetricTile label="Watchlist" value={String(watchlist.length)} />
                <MetricTile
                  label="Breadth"
                  value={`${breadth.advances}A / ${breadth.declines}D`}
                  positive={breadth.advances > breadth.declines}
                />
                <MetricTile
                  label="Risk Alerts"
                  value={String(intelligence.riskAlerts.length)}
                  positive={intelligence.riskAlerts.length === 0}
                />
              </div>
            </div>

            {intelligence.errorMessage ? (
              <p className="mt-2 text-xs text-rose-300">{intelligence.errorMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
