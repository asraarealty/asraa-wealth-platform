"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchCommandBar } from "@/components/v2/workspace";
import { MetricTile, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { useMarketDomainGraph as useMarketOrchestrator } from "@/domains/market";
import { MARKET_SEARCH_MIN_QUERY_LENGTH } from "@/domains/market/search";
import { fmtPercent } from "@/lib/formatters";

function formatCurrency(value: number, currency: "INR" | "USD") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function AdminMarketMonitor() {
  const {
    watchlist,
    marketOverview,
    topGainers,
    topLosers,
    search,
    searchMarket,
    toggleWatchlist,
    isLoading,
    error,
  } = useMarketOrchestrator();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < MARKET_SEARCH_MIN_QUERY_LENGTH) return;
    void searchMarket(query);
  }, [query, searchMarket]);

  const searchResults = useMemo(
    () =>
      [...search.groups.stocks, ...(search.groups.etfs ?? []), ...search.groups.mutualFunds, ...search.groups.commodities].slice(0, 8),
    [search.groups.commodities, search.groups.etfs, search.groups.mutualFunds, search.groups.stocks]
  );

  return (
    <SurfaceCard className="p-4 sm:p-5">
      <SectionHeader
        eyebrow="Market Intelligence"
        title="Market Monitor"
        subtitle="Universal Search, Watchlist, Market Pulse, and Top Movers"
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Universal Search</p>
          <div className="mt-2">
            <SearchCommandBar
              value={query}
              onChange={setQuery}
              placeholder="Search stocks, ETFs, funds, or commodities..."
              label="Market search"
            />
          </div>
          {query.trim().length > 0 && query.trim().length < MARKET_SEARCH_MIN_QUERY_LENGTH ? (
            <p className="mt-3 text-xs text-slate-500">Type at least {MARKET_SEARCH_MIN_QUERY_LENGTH} characters to search.</p>
          ) : null}
          {search.isSearching ? <p className="mt-3 text-xs text-slate-500">Loading search results...</p> : null}
          {query.trim().length >= MARKET_SEARCH_MIN_QUERY_LENGTH && !search.isSearching && searchResults.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-500">
              No market results found.
            </div>
          ) : null}
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
            {searchResults.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{item.symbol}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.name}</p>
                  </div>
                  <button type="button" className="v2-action" onClick={() => toggleWatchlist(item.symbol)}>
                    Watch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Watchlist</p>
          <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
            {watchlist.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-500">
                No watchlist assets yet.
              </div>
            ) : (
              watchlist.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white">{item.symbol}</p>
                    <p className={item.changePercent >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>
                      {fmtPercent(item.changePercent, true)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{item.name}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Market Pulse</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {marketOverview.slice(0, 4).map((metric) => (
              <MetricTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                change={metric.delta}
                positive={metric.tone === "success" ? true : metric.tone === "warn" ? false : undefined}
              />
            ))}
            {!isLoading && marketOverview.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-500">
                Market pulse is currently unavailable.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Top Movers</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs text-emerald-300">Top Gainers</p>
              {topGainers.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white">{item.symbol}</p>
                    <p className="text-xs text-emerald-400">{fmtPercent(item.changePercent, true)}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {item.price > 0 ? formatCurrency(item.price, item.currency) : "—"}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-rose-300">Top Losers</p>
              {topLosers.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white">{item.symbol}</p>
                    <p className="text-xs text-rose-400">{fmtPercent(item.changePercent, true)}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {item.price > 0 ? formatCurrency(item.price, item.currency) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {!isLoading && topGainers.length === 0 && topLosers.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-500">
              Top movers are currently unavailable.
            </div>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
