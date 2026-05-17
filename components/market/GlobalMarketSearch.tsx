"use client";

import { useEffect, useState } from "react";
import { SurfaceCard } from "@/components/v2/ui";
import { useMarketOrchestrator, type MarketAsset } from "@/lib/services/marketOrchestrator";
import { fmtPercent } from "@/lib/formatters";

function SearchRow({ item, onToggle }: { item: MarketAsset; onToggle: (symbol: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{item.name}</p>
        <p className="truncate text-[11px] text-slate-500">
          {item.symbol} · {item.category}
          {item.searchLabel ? ` · ${item.searchLabel}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{item.price > 0 ? item.price.toFixed(2) : "—"}</p>
          <p className={item.changePercent >= 0 ? "text-[11px] text-emerald-400" : "text-[11px] text-rose-400"}>
            {fmtPercent(item.changePercent, true)}
          </p>
        </div>
        <button type="button" className="v2-action" onClick={() => onToggle(item.symbol)}>
          Watch
        </button>
      </div>
    </div>
  );
}

export function GlobalMarketSearch() {
  const { search, searchMarket, toggleWatchlist } = useMarketOrchestrator();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchMarket(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchMarket]);

  return (
    <SurfaceCard className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400/70">Universal market search</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Search stocks, mutual funds, commodities, and ETFs</h2>
          <p className="text-xs text-slate-500">Debounced cross-asset search with grouped result streams.</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Reliance, SBI Small Cap, Gold, SPY…"
          className="v2-input w-full lg:w-[26rem]"
          aria-label="Global market search"
        />
      </div>

      {search.isSearching ? (
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
          Searching live market universe…
        </div>
      ) : null}

      {search.error ? (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {search.error}
        </div>
      ) : null}

      {query.trim() ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {[
            { label: "Stocks", items: search.groups.stocks },
            { label: "Mutual Funds", items: search.groups.mutualFunds },
            { label: "Commodities", items: search.groups.commodities },
          ].map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
                <span className="text-xs text-slate-600">{group.items.length}</span>
              </div>
              {group.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-xs text-slate-500">
                  No {group.label.toLowerCase()} matched this query.
                </div>
              ) : (
                group.items.map((item) => (
                  <SearchRow key={item.id} item={item} onToggle={toggleWatchlist} />
                ))
              )}
            </div>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
