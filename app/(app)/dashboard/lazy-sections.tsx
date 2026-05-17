"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertFeedItem,
  IntelligenceCard,
  MetricTile,
  PropertyHealthCard,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from "@/components/v2/ui";
import { fetchBulkStockQuotes, type StockQuote } from "@/lib/api";
import type { DashboardOperatingData } from "@/lib/hooks/useOperatingSystem";

interface IntelCard {
  title: string;
  message: string;
  tone: "success" | "info" | "warn" | "danger";
  confidence?: number;
}

function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function IntelligenceSection({ intelCards }: { intelCards: IntelCard[] }) {
  return (
    <SurfaceCard className="p-4 sm:p-5">
      <SectionHeader
        eyebrow="AI Intelligence"
        title="Operational insights"
        subtitle="Contextual analysis from live portfolio, cashflow and property data"
        action={<Link href="/insights" className="v2-link">Full analysis →</Link>}
      />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {intelCards.map((card, i) => (
          <IntelligenceCard
            key={i}
            title={card.title}
            message={card.message}
            tone={card.tone}
            confidence={card.confidence}
          />
        ))}
      </div>
    </SurfaceCard>
  );
}

export function ActionsRecommendationsSection({ data }: { data: DashboardOperatingData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <SurfaceCard className="p-4 sm:p-5 xl:col-span-3">
        <SectionHeader
          eyebrow="Priority Actions"
          title="What needs attention"
          subtitle="Ranked by urgency across portfolio, property and cashflow"
        />
        <div className="mt-4 space-y-2">
          {data.priorityActions.length === 0 ? (
            <p className="text-xs text-slate-500">No outstanding actions. Portfolio is operating normally.</p>
          ) : (
            data.priorityActions.map((action) => (
              <div key={action.id} className="v2-tile rounded-xl p-3 flex items-start gap-3">
                <StatusPill
                  label={action.severity.toUpperCase()}
                  tone={action.severity === "high" ? "danger" : action.severity === "medium" ? "warn" : "info"}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{action.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
        <SectionHeader
          eyebrow="Recommendations"
          title="Next-best actions"
          subtitle="Confidence-ranked AI suggestions"
        />
        <div className="mt-4 space-y-3">
          {data.recommendations.length === 0 ? (
            <p className="text-xs text-slate-500">No predictive actions flagged.</p>
          ) : (
            data.recommendations.map((r) => (
              <IntelligenceCard
                key={r.id}
                title={r.title}
                message={r.rationale}
                confidence={r.confidence}
                tone="info"
              />
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}

export function RealEstateActivitySection({ data }: { data: DashboardOperatingData }) {
  const topProperties = data.properties.slice(0, 4);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
        <SectionHeader
          eyebrow="Property Operations"
          title="Real estate health"
          subtitle="Rent pipeline, occupancy and cashflow"
          action={<Link href="/real-estate" className="v2-link">Full ops →</Link>}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricTile label="RE Asset Value" value={fmtCompact(data.realEstate.totalValue)} />
          <MetricTile label="Monthly Rent" value={fmtCompact(data.realEstate.monthlyRent)} />
          <MetricTile label="Occupied" value={String(data.realEstate.occupied)} sub="units" />
          <MetricTile
            label="Rental Yield"
            value={`${data.realEstate.rentalYieldPct.toFixed(1)}%`}
            sub="Annual gross"
          />
        </div>

        {topProperties.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Property status</p>
            {topProperties.map((p) => {
              const isOccupied = Boolean(p.tenant_name);
              const rentStatus: "overdue" | "due-soon" | "clear" = !p.rent_due_date
                ? "clear"
                : (() => {
                    const diff = Math.ceil(
                      (new Date(p.rent_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    if (diff < 0 && !p.rent_received) return "overdue";
                    if (diff <= 5 && !p.rent_received) return "due-soon";
                    return "clear";
                  })();
              return (
                <PropertyHealthCard
                  key={p.id}
                  name={p.name}
                  occupied={isOccupied}
                  rentStatus={rentStatus}
                  monthlyRent={
                    p.rent_amount
                      ? fmtCompact(Number(p.rent_amount))
                      : "—"
                  }
                />
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {data.realEstate.overdueRent > 0 && (
            <StatusPill label={`${data.realEstate.overdueRent} overdue`} tone="danger" />
          )}
          {data.realEstate.dueSoonRent > 0 && (
            <StatusPill label={`${data.realEstate.dueSoonRent} due soon`} tone="warn" />
          )}
          {data.realEstate.leaseExpiry > 0 && (
            <StatusPill label={`${data.realEstate.leaseExpiry} expiring`} tone="warn" />
          )}
          {data.realEstate.overdueRent === 0 && data.realEstate.dueSoonRent === 0 && (
            <StatusPill label="Rent pipeline clear" tone="success" />
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5 xl:col-span-3">
        <SectionHeader
          eyebrow="Activity + Transactions"
          title="Operational timeline"
          subtitle="Cross-domain event stream — assets, properties, intelligence"
          action={<Link href="/activity" className="v2-link">View all →</Link>}
        />
        <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {data.activityFeed.length === 0 ? (
            <p className="text-xs text-slate-500">No recent activity recorded.</p>
          ) : (
            data.activityFeed.slice(0, 10).map((event) => (
              <AlertFeedItem
                key={event.id}
                title={event.title}
                message={event.message}
                type={event.type}
                timestamp={event.timestamp}
              />
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}

// ── Market Discovery Section ──────────────────────────────────────────────────

const MARKET_MOVERS_SYMBOLS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "BAJFINANCE.NS",
  "ICICIBANK.NS",
  "KOTAKBANK.NS",
  "HINDUNILVR.NS",
];

const REFRESH_INTERVAL_MS = 45_000;

function fmtPrice(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function MarketDiscoverySection({ data }: { data: DashboardOperatingData }) {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchBulkStockQuotes(MARKET_MOVERS_SYMBOLS);
        if (!cancelled) {
          const list = Array.isArray(result) ? result : [];
          setQuotes(list);
        }
      } catch {
        // Silently ignore; movers section is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const timer = setInterval(() => { void load(); }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const stockSymbols = data.assets
    .filter((asset) => asset.type === "stock" && asset.symbol)
    .map((asset) => asset.symbol as string);

  const watchlistQuotes = quotes.filter((q) =>
    stockSymbols.some((s) => s.toUpperCase() === q.symbol?.toUpperCase())
  );
  const movers = [...quotes]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);

  const insights = [
    {
      title: "Market Pulse",
      message: "Indian equity markets are actively monitored for your portfolio symbols.",
      tone: "info" as const,
    },
    {
      title: "Diversification Opportunity",
      message: "Review top movers to identify rebalancing opportunities across your holdings.",
      tone: "info" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Market Discovery"
          title="Live market intelligence"
          subtitle="Real-time movers, watchlist status, and opportunity signals"
          action={<Link href="/stocks" className="v2-link">Explore markets →</Link>}
        />
        <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Market movers */}
          <div className="xl:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-3">Top movers (Nifty 50)</p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.06]" />
                ))}
              </div>
            ) : movers.length === 0 ? (
              <p className="text-xs text-slate-500">Market data loading…</p>
            ) : (
              <div className="space-y-2">
                {movers.map((q) => {
                  const isPositive = q.changePercent >= 0;
                  return (
                    <div key={q.symbol} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{q.name || q.symbol}</p>
                        <p className="text-[11px] text-slate-500">{q.symbol}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-semibold text-white">{q.price > 0 ? fmtPrice(q.price) : "—"}</p>
                        <p className={`text-xs font-medium ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPositive ? "+" : ""}{q.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Watchlist + opportunity cards */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Portfolio watchlist</p>
            {watchlistQuotes.length === 0 ? (
              <p className="text-xs text-slate-500">No matching watchlist symbols in live market data.</p>
            ) : (
              watchlistQuotes.slice(0, 4).map((q) => {
                const isPositive = q.changePercent >= 0;
                return (
                  <div key={q.symbol} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-sm font-medium text-white truncate">{q.symbol}</p>
                    <p className={`text-xs font-semibold shrink-0 ml-3 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPositive ? "+" : ""}{q.changePercent.toFixed(2)}%
                    </p>
                  </div>
                );
              })
            )}
            <div className="mt-3 space-y-2">
              {insights.map((insight) => (
                <IntelligenceCard key={insight.title} title={insight.title} message={insight.message} tone={insight.tone} />
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
