"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fetchBulkQuotes } from "@/domains/market/quotes";
import { searchMarketDebounced } from "@/domains/market/search";
import {
  getWatchlistSymbols,
  toggleWatchlistSymbol,
} from "@/domains/market/watchlist";
import type { MarketAsset, MarketAssetKind } from "@/domains/market/types";

const RECENT_STORAGE_KEY = "asraa.live-asset-picker.recent";

export interface LiveAssetSelection {
  symbol: string;
  name: string;
  kind: MarketAssetKind;
  market: MarketAsset["market"];
  category: string;
  exchange?: string;
  price: number;
  changePercent: number;
  currency: MarketAsset["currency"];
}

interface LiveAssetPickerProps {
  value?: string;
  placeholder?: string;
  allowedKinds?: MarketAssetKind[];
  onSelect: (asset: LiveAssetSelection) => void;
}

function asBadge(kind: MarketAssetKind) {
  if (kind === "mutual-fund") return "MF";
  if (kind === "commodity") return "CMD";
  if (kind === "metal") return "METAL";
  if (kind === "etf") return "ETF";
  if (kind === "global-stock") return "GLOBAL";
  if (kind === "index") return "INDEX";
  if (kind === "forex") return "FX";
  return "STOCK";
}

function toSelection(item: MarketAsset): LiveAssetSelection {
  return {
    symbol: item.symbol,
    name: item.name,
    kind: item.kind,
    market: item.market,
    category: item.category,
    exchange: item.searchLabel,
    price: item.price,
    changePercent: item.changePercent,
    currency: item.currency,
  };
}

function isQuoteKind(kind: MarketAssetKind) {
  return kind === "stock" || kind === "global-stock" || kind === "etf" || kind === "index" || kind === "forex";
}

function toIsoTimestamp(value: unknown, fallback: string) {
  const parsed = typeof value === "number" ? new Date(value) : new Date(String(value ?? ""));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : fallback;
}

function readRecentSelections() {
  if (typeof window === "undefined") return [] as LiveAssetSelection[];
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as LiveAssetSelection[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.symbol === "string").slice(0, 8);
  } catch (error) {
    console.warn("[market-picker] recent selection cache parse failed", error);
    return [];
  }
}

function writeRecentSelections(items: LiveAssetSelection[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items.slice(0, 8)));
}

export function LiveAssetPicker({
  value = "",
  placeholder = "Search live assets",
  allowedKinds,
  onSelect,
}: LiveAssetPickerProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [recentSelections, setRecentSelections] = useState<LiveAssetSelection[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const kindsFilter = useMemo(() => new Set(allowedKinds ?? []), [allowedKinds]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setWatchlistSymbols(getWatchlistSymbols());
    setRecentSelections(readRecentSelections());
  }, []);

  useEffect(() => {
    let active = true;
    const normalized = query.trim();

    if (normalized.length < 2) {
      setResults([]);
      setOpen(normalized.length > 0 || recentSelections.length > 0);
      setLoading(false);
      return;
    }

    setLoading(true);
    void searchMarketDebounced(normalized, {
      delayMs: 250,
      watchlistSymbols,
    })
      .then(async (groups) => {
        if (!active) return;

        const merged = [
          ...groups.stocks,
          ...(groups.etfs ?? []),
          ...groups.mutualFunds,
          ...groups.commodities,
        ];

        const deduped = [...new Map(merged.map((item) => [item.id, item])).values()];
        const filtered =
          kindsFilter.size > 0
            ? deduped.filter((item) => kindsFilter.has(item.kind))
            : deduped;

        const quoteCandidates = filtered.filter((item) => isQuoteKind(item.kind));
        if (quoteCandidates.length > 0) {
          const quotes = await fetchBulkQuotes(
            quoteCandidates.map((item) => item.symbol),
            { preservePreviousData: true }
          );
          const hydrated = filtered.map((item) => {
            const quote = quotes.get(item.symbol.toUpperCase());
            if (!quote) return item;
            return {
              ...item,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              volume: quote.volume,
              marketCap: quote.marketCap,
              lastUpdated: toIsoTimestamp(quote.lastUpdated, item.lastUpdated),
            };
          });
          if (!active) return;
          setResults(hydrated.slice(0, 20));
        } else {
          setResults(filtered.slice(0, 20));
        }

        setOpen(true);
        setActiveIndex(-1);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, watchlistSymbols, kindsFilter, recentSelections.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const grouped = useMemo(() => {
    const stocks = results.filter((item) => item.kind === "stock" || item.kind === "global-stock");
    const etfs = results.filter((item) => item.kind === "etf");
    const mutualFunds = results.filter((item) => item.kind === "mutual-fund");
    const commodities = results.filter((item) => item.kind === "commodity" || item.kind === "metal");

    return [
      { label: "Stocks", items: stocks },
      { label: "ETFs", items: etfs },
      { label: "Mutual Funds", items: mutualFunds },
      { label: "Commodities & Metals", items: commodities },
    ].filter((group) => group.items.length > 0);
  }, [results]);

  const flatResults = useMemo(() => grouped.flatMap((group) => group.items), [grouped]);

  function handleSelect(item: MarketAsset) {
    const selection = toSelection(item);
    onSelect(selection);
    setQuery(`${item.symbol} · ${item.name}`);
    setOpen(false);

    setRecentSelections((previous) => {
      const next = [selection, ...previous.filter((entry) => entry.symbol !== selection.symbol)].slice(0, 8);
      writeRecentSelections(next);
      return next;
    });
  }

  function handleToggleWatchlist(symbol: string) {
    const next = toggleWatchlistSymbol(symbol, watchlistSymbols);
    setWatchlistSymbols(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || flatResults.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((value) => Math.min(value + 1, flatResults.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((value) => (value <= 0 ? -1 : value - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(flatResults[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/40 focus:bg-sky-500/[0.08]"
        aria-label="Live asset picker"
      />

      {open ? (
        <div className="absolute z-50 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#040915] p-2 shadow-2xl">
          {loading ? <p className="px-2 py-2 text-xs text-slate-400">Searching live market...</p> : null}

          {!loading && query.trim().length < 2 && recentSelections.length > 0 ? (
            <div className="space-y-1">
              <p className="px-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">Recent selections</p>
              {recentSelections.map((item) => (
                <button
                  key={`recent-${item.symbol}`}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.08]"
                >
                  <span>
                    <span>{item.symbol}</span>
                    <span aria-hidden="true"> - </span>
                    <span>{item.name}</span>
                  </span>
                  <span className="text-slate-400">{asBadge(item.kind)}</span>
                </button>
              ))}
            </div>
          ) : null}

          {grouped.map((group) => (
            <div key={group.label} className="mt-2 space-y-1">
              <p className="px-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">{group.label}</p>
              {group.items.map((item) => {
                const index = flatResults.findIndex((entry) => entry.id === item.id);
                const isWatchlisted = watchlistSymbols.includes(item.symbol.toUpperCase());
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${
                      index === activeIndex
                        ? "border-sky-300/40 bg-sky-500/20"
                        : "border-white/8 bg-white/[0.03]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{item.symbol}</span>
                        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                          {asBadge(item.kind)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-400">{item.name}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {item.market} · {item.category}{item.searchLabel ? ` · ${item.searchLabel}` : ""}
                      </p>
                    </button>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-white">
                        {item.price > 0 ? item.price.toFixed(2) : "—"}
                      </p>
                      <p className={`text-[10px] ${item.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {item.changePercent >= 0 ? "+" : ""}
                        {item.changePercent.toFixed(2)}%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleWatchlist(item.symbol)}
                      className={`rounded-md border px-1.5 py-1 text-[10px] ${
                        isWatchlisted
                          ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                      aria-label={`Toggle watchlist ${item.symbol}`}
                    >
                      ★
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {!loading && grouped.length === 0 && query.trim().length >= 2 ? (
            <p className="px-2 py-2 text-xs text-slate-500">No live assets matched this search.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
