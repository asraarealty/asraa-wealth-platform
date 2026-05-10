"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { searchStocks, type StockQuote, ApiError } from "@/lib/api";

const USD_TO_INR = 83;

function getCurrency(symbol: string): "INR" | "USD" {
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) return "INR";
  return "USD";
}

function normalizePrice(price: number | null, currency: "INR" | "USD"): number {
  if (price === null) return 0;
  if (currency === "USD") return price * USD_TO_INR;
  return price;
}

function formatPrice(price: number | null, currency: "INR" | "USD"): string {
  if (price === null) return "--";
  const normalized = normalizePrice(price, currency);
  return `₹${normalized.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatMarketCap(value: number | null, currency: "INR" | "USD"): string {
  if (value === null || value === 0) return "--";
  const normalized = normalizePrice(value, currency);
  if (normalized >= 1e12) return `₹${(normalized / 1e12).toFixed(2)}T`;
  if (normalized >= 1e7) return `₹${(normalized / 1e7).toFixed(2)}Cr`;
  if (normalized >= 1e5) return `₹${(normalized / 1e5).toFixed(2)}L`;
  return `₹${normalized.toLocaleString("en-IN")}`;
}

interface StockSearchProps {
  onSelect?: (stock: StockQuote) => void;
}

export default function StockSearch({ onSelect }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setIsRetryable(false);

      searchStocks(query.trim(), controller.signal)
        .then((data) => {
          const raw = (Array.isArray(data) ? data : []).map((item) => ({
            ...item,
            price: item.price ?? null,
            change: item.change ?? 0,
            changePercent: item.changePercent ?? 0,
            marketCap: item.marketCap ?? null,
          }));
          const q = query.trim().toLowerCase();

          // 1. Filter to Indian stocks (.NS or .BO)
          const indian = raw.filter(
            (item) =>
              item.symbol?.endsWith(".NS") || item.symbol?.endsWith(".BO")
          );

          // 2. Filter to results whose name contains the query
          const nameMatches = (indian.length > 0 ? indian : raw).filter(
            (item) => item.name?.toLowerCase().includes(q)
          );

          // 3. Remove junk: no name, or "0P…" mutual-fund tickers
          const clean = nameMatches.filter(
            (item) => item.name && !item.symbol?.startsWith("0P")
          );

          // 4. Sort: exact prefix matches first, then partial; break ties alphabetically
          clean.sort((a, b) => {
            const aExact = a.name?.toLowerCase().startsWith(q) ? 1 : 0;
            const bExact = b.name?.toLowerCase().startsWith(q) ? 1 : 0;
            return bExact - aExact || a.name.localeCompare(b.name);
          });

          // 5. Limit to top 10
          setResults(clean.slice(0, 10));
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (err instanceof ApiError) {
            if (err.status === 404) {
              setError("Stock not found");
              setIsRetryable(false);
            } else if (err.status === 401) {
              setError("Session expired. Please sign in again.");
              setIsRetryable(false);
            } else if (err.status >= 500) {
              setError("Server error — please retry");
              setIsRetryable(true);
            } else {
              setError(err.message || "Search failed");
              setIsRetryable(false);
            }
          } else {
            setError(err instanceof Error ? err.message : "Search failed");
            setIsRetryable(false);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query, retryKey]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleSelect(stock: StockQuote) {
    setQuery(stock.symbol);
    setOpen(false);
    onSelect?.(stock);
  }

  const isPositive = (v: number) => v >= 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="rgba(201,162,39,0.5)"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          name="stock-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search stocks — Kotak, Reliance, Apple…"
          className="w-full gold-input pl-10 pr-4 py-2.5 text-sm rounded-xl"
          aria-label="Search stocks"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            style={{ color: "#c9a227" }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
      </div>

      {error && (
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-xs text-red-400">{error}</p>
          {isRetryable && (
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="text-xs underline"
              style={{ color: "#c9a227" }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full search-dropdown rounded-xl overflow-hidden max-h-80 overflow-y-auto"
        >
          {results.length === 0 && !loading && (
            <li className="px-4 py-3 text-sm text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
          {results.map((stock, i) => (
            <li
              key={stock.symbol}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(stock)}
              onMouseEnter={() => setActiveIndex(i)}
              className="search-dropdown-item flex items-center justify-between gap-4 px-4 py-3 cursor-pointer text-sm"
            >
              <div className="min-w-0">
                <span className="font-semibold text-white">{stock.name}</span>
                <span className="ml-2 text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {stock.symbol}
                </span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-white font-medium">
                  {formatPrice(stock.price, getCurrency(stock.symbol))}
                </div>
                <div
                  className={`text-xs font-medium ${
                    isPositive(stock.changePercent)
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {isPositive(stock.changePercent) ? "+" : ""}
                  {typeof stock.changePercent === "number" ? stock.changePercent.toFixed(2) : "0.00"}%
                </div>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <div className="text-xs" style={{ color: "rgba(201,162,39,0.5)" }}>Mkt Cap</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {formatMarketCap(stock.marketCap, getCurrency(stock.symbol))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
