"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { searchMutualFunds, type MutualFundResult } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

/** Debounce delay in ms — prevents excessive API calls while user is typing */
const SEARCH_DEBOUNCE_MS = 350;

interface MFSearchProps {
  onSelect?: (mf: MutualFundResult) => void;
  initialValue?: string;
}

export default function MFSearch({ onSelect, initialValue = "" }: MFSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<MutualFundResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
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

      searchMutualFunds(query.trim(), controller.signal)
        .then((data) => {
          setResults(Array.isArray(data) ? data : []);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(toErrorMessage(err));
        })
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query]);

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

  function handleSelect(mf: MutualFundResult) {
    setQuery(mf.name);
    setOpen(false);
    onSelect?.(mf);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="rgba(56,189,248,0.5)"
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
          placeholder="Search mutual funds — HDFC, SBI, Axis…"
          className="w-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 rounded-xl transition focus:outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(56,189,248,0.2)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(56,189,248,0.5)";
            e.currentTarget.style.boxShadow =
              "0 0 0 2px rgba(56,189,248,0.12)";
            if (results.length > 0) setOpen(true);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(56,189,248,0.2)";
            e.currentTarget.style.boxShadow = "none";
          }}
          aria-label="Search mutual funds"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            style={{ color: "#38bdf8" }}
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

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
          style={{
            background: "rgba(8,48,36,0.97)",
            border: "1px solid rgba(56,189,248,0.2)",
            backdropFilter: "blur(20px)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.08)",
          }}
        >
          {results.length === 0 && !loading && (
            <li
              className="px-4 py-3 text-sm text-center"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
          {results.map((mf, i) => (
            <li
              key={mf.code}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(mf)}
              onMouseEnter={() => setActiveIndex(i)}
              className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer transition text-sm"
              style={{
                background:
                  i === activeIndex ? "rgba(56,189,248,0.1)" : "transparent",
                borderBottom:
                  i < results.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
              }}
            >
              <div className="min-w-0">
                <span className="font-semibold text-white truncate block">
                  {mf.name}
                </span>
                {mf.category && (
                  <span
                    className="text-xs truncate"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {mf.fund_house ? `${mf.fund_house} · ` : ""}
                    {mf.category}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-white font-medium">
                  ₹{typeof mf.nav === "number" ? mf.nav.toFixed(2) : "—"}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "rgba(56,189,248,0.6)" }}
                >
                  NAV
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
