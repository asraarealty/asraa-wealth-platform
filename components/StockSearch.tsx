"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { searchStocks, type StockQuote } from "@/lib/api";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
}

interface StockSearchProps {
  onSelect?: (stock: StockQuote) => void;
}

export default function StockSearch({ onSelect }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      searchStocks(query.trim(), controller.signal)
        .then((data) => {
          setResults(data);
          setOpen(data.length > 0);
          setActiveIndex(-1);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Search failed");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query]);

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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search stocks — AAPL, TSLA, MSFT…"
          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          aria-label="Search stocks"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
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
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
        >
          {results.map((stock, i) => (
            <li
              key={stock.symbol}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(stock)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center justify-between gap-4 px-4 py-3 cursor-pointer transition text-sm ${
                i === activeIndex ? "bg-gray-800" : "hover:bg-gray-800/60"
              }`}
            >
              <div className="min-w-0">
                <span className="font-semibold text-white">{stock.symbol}</span>
                <span className="ml-2 text-gray-400 truncate text-xs">
                  {stock.name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-white font-medium">
                  {formatCurrency(stock.price)}
                </div>
                <div
                  className={`text-xs font-medium ${
                    isPositive(stock.change_percent)
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {isPositive(stock.change_percent) ? "+" : ""}
                  {stock.change_percent.toFixed(2)}%
                </div>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <div className="text-gray-400 text-xs">Mkt Cap</div>
                <div className="text-gray-300 text-xs">
                  {formatMarketCap(stock.market_cap)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
