"use client";

import { useCallback } from "react";
import AsyncSearchDropdown from "@/components/search/AsyncSearchDropdown";
import { searchStocks, type StockQuote } from "@/lib/api";

interface StockSearchProps {
  onSelect?: (stock: StockQuote) => void;
}

type NormalizedStock = StockQuote & {
  exchangeLabel: string;
  rootSymbol: string;
};

const VALID_STOCK_SYMBOL_PATTERN = /^[A-Za-z0-9.\-]{2,20}$/;

function inferExchange(symbol: string): string {
  if (symbol.endsWith(".NS")) return "NSE";
  if (symbol.endsWith(".BO")) return "BSE";
  return "GLOBAL";
}

function rootSymbol(symbol: string): string {
  return symbol.replace(/\.(NS|BO)$/i, "").toUpperCase();
}

function isValidStock(item: StockQuote): boolean {
  if (!item) return false;
  if (typeof item.symbol !== "string" || !VALID_STOCK_SYMBOL_PATTERN.test(item.symbol)) return false;
  if (typeof item.name !== "string" || item.name.trim().length < 2) return false;
  return true;
}

function formatPrice(price: number | null | undefined): string {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return "—";
  return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatMarketCap(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function normalizeStocks(results: StockQuote[], query: string): NormalizedStock[] {
  const q = query.trim().toLowerCase();
  const valid = results
    .filter(isValidStock)
    .map((item) => {
      const exchangeLabel = (item.exchange ?? inferExchange(item.symbol)).toUpperCase();
      return {
        ...item,
        exchangeLabel,
        rootSymbol: rootSymbol(item.symbol),
        changePercent:
          typeof item.changePercent === "number" && Number.isFinite(item.changePercent)
            ? item.changePercent
            : 0,
      };
    });

  const indian = valid.filter((item) => item.exchangeLabel === "NSE" || item.exchangeLabel === "BSE");
  const pool = indian.length > 0 ? indian : valid;
  const seen = new Set<string>();
  const deduped: NormalizedStock[] = [];

  const ranked = [...pool].sort((a, b) => {
    const aExact = a.name.toLowerCase().startsWith(q) || a.rootSymbol.toLowerCase().startsWith(q) ? 1 : 0;
    const bExact = b.name.toLowerCase().startsWith(q) || b.rootSymbol.toLowerCase().startsWith(q) ? 1 : 0;
    const aNse = a.exchangeLabel === "NSE" ? 1 : 0;
    const bNse = b.exchangeLabel === "NSE" ? 1 : 0;
    const aHasPrice = typeof a.price === "number" && a.price > 0 ? 1 : 0;
    const bHasPrice = typeof b.price === "number" && b.price > 0 ? 1 : 0;
    const aHasMcap = typeof a.marketCap === "number" && a.marketCap > 0 ? 1 : 0;
    const bHasMcap = typeof b.marketCap === "number" && b.marketCap > 0 ? 1 : 0;
    return (
      bExact - aExact ||
      bNse - aNse ||
      bHasPrice - aHasPrice ||
      bHasMcap - aHasMcap ||
      a.name.localeCompare(b.name)
    );
  });

  for (const item of ranked) {
    if (seen.has(item.rootSymbol)) continue;
    seen.add(item.rootSymbol);
    deduped.push(item);
  }

  return deduped.slice(0, 12);
}

export default function StockSearch({ onSelect }: StockSearchProps) {
  const runSearch = useCallback(
    async (query: string, signal: AbortSignal) => {
      const raw = await searchStocks(query, signal);
      return normalizeStocks(Array.isArray(raw) ? raw : [], query);
    },
    []
  );

  const renderItem = useCallback((stock: NormalizedStock) => {
    const pct = Number.isFinite(stock.changePercent) ? stock.changePercent : 0;
    const positive = pct >= 0;
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">{stock.name}</div>
          <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
            {stock.symbol} · {stock.exchangeLabel}
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Mkt Cap: {formatMarketCap(stock.marketCap)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-white font-medium">{formatPrice(stock.price)}</div>
          <div className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {positive ? "+" : ""}
            {pct.toFixed(2)}%
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <AsyncSearchDropdown<NormalizedStock>
      placeholder="Search stocks — NSE/BSE first"
      ariaLabel="Search stocks"
      minQueryLength={1}
      search={runSearch}
      getItemKey={(item) => item.rootSymbol}
      getItemText={(item) => item.symbol}
      renderItem={renderItem}
      onSelect={(item) => onSelect?.(item)}
      emptyText={(q) => `No stock matches for “${q}”`}
    />
  );
}
