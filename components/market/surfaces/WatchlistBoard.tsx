"use client";

import { memo, useEffect, useState } from "react";
import { SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { fmtPercent, fmtLastUpdated } from "@/lib/formatters";
import { useMarketDomainGraph, useMarketIntelligenceEngine, type MarketAsset } from "@/domains/market";

type AlertLevel = "critical" | "warning" | "info";

interface LiveAlert {
  id: string;
  symbol: string;
  message: string;
  level: AlertLevel;
  at: string;
}

function buildLiveAlerts(
  topGainers: MarketAsset[],
  topLosers: MarketAsset[],
  riskAlerts: string[]
): LiveAlert[] {
  const alerts: LiveAlert[] = [];

  topGainers.slice(0, 2).forEach((a) => {
    if (a.changePercent >= 3) {
      alerts.push({
        id: `spike-${a.symbol}`,
        symbol: a.symbol,
        message: `Volatility spike +${a.changePercent.toFixed(1)}% — momentum signal`,
        level: "warning",
        at: "live",
      });
    }
  });

  topLosers.slice(0, 2).forEach((a) => {
    if (a.changePercent <= -3) {
      alerts.push({
        id: `drop-${a.symbol}`,
        symbol: a.symbol,
        message: `Drawdown alert ${a.changePercent.toFixed(1)}% — risk trigger`,
        level: "critical",
        at: "live",
      });
    }
  });

  riskAlerts.slice(0, 3).forEach((msg, i) => {
    alerts.push({ id: `ai-${i}`, symbol: "AI", message: msg, level: "info", at: "AI" });
  });

  return alerts;
}

const ALERT_STYLES: Record<AlertLevel, string> = {
  critical: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  info: "border-sky-400/20 bg-sky-500/[0.07] text-sky-200",
};

const ALERT_PILL_TONE: Record<AlertLevel, "danger" | "warn" | "info"> = {
  critical: "danger",
  warning: "warn",
  info: "info",
};

type WatchlistGroup = "India" | "Global" | "Fund" | "Commodity" | "Macro" | "All";
const GROUPS: WatchlistGroup[] = ["All", "India", "Global", "Fund", "Commodity", "Macro"];

const WatchRow = memo(function WatchRow({
  item,
  onRemove,
}: {
  item: MarketAsset;
  onRemove: (symbol: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{item.symbol}</p>
        <p className="text-[10px] text-slate-500 truncate">{item.name}</p>
      </div>
      <p
        className={`text-xs font-semibold tabular-nums ${
          item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {fmtPercent(item.changePercent, true)}
      </p>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
          item.changePercent >= 2
            ? "bg-emerald-500/20 text-emerald-300"
            : item.changePercent <= -2
            ? "bg-rose-500/20 text-rose-300"
            : "bg-white/10 text-slate-400"
        }`}
      >
        {item.changePercent >= 2 ? "SURGE" : item.changePercent <= -2 ? "SELL" : "HOLD"}
      </span>
      <button
        type="button"
        className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors"
        onClick={() => onRemove(item.symbol)}
        aria-label={`Remove ${item.symbol} from watchlist`}
      >
        ✕
      </button>
    </div>
  );
});

export function WatchlistBoard() {
  const {
    assets,
    watchlist,
    topGainers,
    topLosers,
    sectorMovers,
    toggleWatchlist,
    isLoading,
    error,
    refresh,
    lastUpdated,
  } = useMarketDomainGraph();

  const intelligence = useMarketIntelligenceEngine(null, sectorMovers, watchlist);

  const [group, setGroup] = useState<WatchlistGroup>("All");
  const [pulse, setPulse] = useState(true);

  // Simulate live blink every 3s
  useEffect(() => {
    const timer = setInterval(() => setPulse((p) => !p), 3000);
    return () => clearInterval(timer);
  }, []);

  const filteredWatchlist =
    group === "All" ? watchlist : watchlist.filter((a) => a.market === group);

  const liveAlerts = buildLiveAlerts(topGainers, topLosers, intelligence.riskAlerts);

  const suggestedAssets = assets
    .filter((a) => !watchlist.some((w) => w.symbol === a.symbol))
    .sort((x, y) => Math.abs(y.changePercent) - Math.abs(x.changePercent))
    .slice(0, 6);

  const updatedAt = fmtLastUpdated(lastUpdated);

  return (
    <SurfaceCard className="p-0 overflow-hidden">
      {/* Operations board header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500/20">
            <span className="text-[9px] font-bold text-emerald-300">WL</span>
            <span
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 transition-opacity ${
                pulse ? "opacity-100" : "opacity-30"
              }`}
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-400/80">Watchlist Operations</p>
            <p className="text-[11px] text-slate-500">
              Live monitoring · alerts · triggers
              {updatedAt ? ` · ${updatedAt}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {liveAlerts.filter((a) => a.level === "critical").length > 0 ? (
            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
              {liveAlerts.filter((a) => a.level === "critical").length} critical
            </span>
          ) : null}
          {error ? <span className="text-[10px] text-rose-400">Feed error</span> : null}
          <button type="button" className="v2-action text-[10px]" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px]">
        {/* ── Main: Watchlist table ── */}
        <div className="border-r border-white/8 overflow-hidden">
          {/* Group filter tabs */}
          <div className="flex gap-0 overflow-x-auto border-b border-white/8">
            {GROUPS.map((g) => {
              const count = g === "All" ? watchlist.length : watchlist.filter((a) => a.market === g).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`border-b-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors whitespace-nowrap ${
                    group === g
                      ? "border-emerald-400 text-emerald-300"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {g}
                  {count > 0 ? (
                    <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-400">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Watchlist rows */}
          <div className="p-3 space-y-1.5 min-h-[300px]">
            {isLoading && watchlist.length === 0 ? (
              <p className="text-xs text-slate-500 pt-4 text-center">Loading watchlist…</p>
            ) : filteredWatchlist.length === 0 ? (
              <div className="pt-6 text-center">
                <p className="text-sm text-slate-400">No assets in watchlist{group !== "All" ? ` for ${group}` : ""}.</p>
                <p className="mt-1 text-xs text-slate-600">Add from the suggested assets below.</p>
              </div>
            ) : (
              filteredWatchlist.map((item) => (
                <WatchRow key={item.id} item={item} onRemove={toggleWatchlist} />
              ))
            )}
          </div>

          {/* Suggested: add to watchlist */}
          {suggestedAssets.length > 0 ? (
            <div className="border-t border-white/8 p-3">
              <p className="mb-2 text-[9px] uppercase tracking-[0.14em] text-slate-600">
                Suggested — highest activity
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {suggestedAssets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleWatchlist(item.symbol)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-white truncate">{item.symbol}</p>
                    </div>
                    <p
                      className={`shrink-0 text-[11px] ${item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {fmtPercent(item.changePercent, true)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Right: Alerts + Signal changes rail ── */}
        <div className="overflow-y-auto">
          <div className="border-b border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-emerald-400/70">Live Alerts</p>
          </div>

          <div className="p-3 space-y-2">
            {liveAlerts.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-4 text-center">
                <p className="text-xs text-slate-500">No active alerts.</p>
                <p className="mt-1 text-[10px] text-slate-600">System monitoring {watchlist.length} symbols.</p>
              </div>
            ) : (
              liveAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border px-3 py-2.5 ${ALERT_STYLES[alert.level]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold">{alert.symbol}</p>
                    <StatusPill label={alert.level.toUpperCase()} tone={ALERT_PILL_TONE[alert.level]} />
                  </div>
                  <p className="mt-1 text-[11px] leading-4 opacity-90">{alert.message}</p>
                  <p className="mt-1 text-[9px] opacity-50">{alert.at}</p>
                </div>
              ))
            )}
          </div>

          {/* AI event detection */}
          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-sky-400/70">AI Event Detection</p>
          </div>
          <div className="p-3 space-y-2">
            {intelligence.aiInsights.slice(0, 4).map((insight) => (
              <div
                key={insight.title}
                className="rounded-xl border border-sky-400/10 bg-sky-500/[0.05] px-3 py-2.5"
              >
                <p className="text-[10px] font-semibold text-sky-300">{insight.title}</p>
                <p className="mt-1 text-[11px] text-slate-400 leading-4">{insight.message}</p>
              </div>
            ))}
            {intelligence.isLoading ? (
              <p className="text-[11px] text-slate-500">Loading AI signals…</p>
            ) : null}
          </div>

          {/* Signal changes */}
          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Signal Changes</p>
          </div>
          <div className="p-3 space-y-1.5">
            {[...topGainers.slice(0, 3), ...topLosers.slice(0, 3)].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2"
              >
                <p className="text-[11px] text-slate-300">{item.symbol}</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-semibold ${
                      item.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {fmtPercent(item.changePercent, true)}
                  </span>
                  <span
                    className={`rounded px-1 py-0.5 text-[9px] ${
                      item.changePercent >= 0
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {item.changePercent >= 0 ? "▲" : "▼"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden border-t border-white/8 p-3 space-y-3">
        <SectionHeader title="Watchlist" subtitle="Live monitoring" />
        {watchlist.slice(0, 8).map((item) => (
          <WatchRow key={item.id} item={item} onRemove={toggleWatchlist} />
        ))}
        <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.05] p-3">
          <p className="text-[10px] text-amber-400/80 mb-2">Active Alerts</p>
          {liveAlerts.slice(0, 3).map((alert) => (
            <p key={alert.id} className="text-xs text-amber-100/80 mb-1">
              {alert.symbol}: {alert.message}
            </p>
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}
