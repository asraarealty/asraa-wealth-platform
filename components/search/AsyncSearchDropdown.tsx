"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toErrorMessage } from "@/lib/fetcher";

interface AsyncSearchDropdownProps<T> {
  placeholder: string;
  ariaLabel: string;
  minQueryLength?: number;
  debounceMs?: number;
  initialValue?: string;
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  getItemKey: (item: T, index: number) => string;
  getItemText: (item: T) => string;
  renderItem: (item: T, active: boolean) => ReactNode;
  onSelect?: (item: T) => void;
  emptyText?: (query: string) => string;
}

export default function AsyncSearchDropdown<T>({
  placeholder,
  ariaLabel,
  minQueryLength = 2,
  debounceMs = 350,
  initialValue = "",
  search,
  getItemKey,
  getItemText,
  renderItem,
  onSelect,
  emptyText = (q) => `No results for “${q}”`,
}: AsyncSearchDropdownProps<T>) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (query.trim().length < minQueryLength) {
      setResults([]);
      setError(null);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      abortRef.current?.abort();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      search(query.trim(), controller.signal)
        .then((items) => {
          if (requestId !== requestIdRef.current) return;
          setResults(Array.isArray(items) ? items : []);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setError(toErrorMessage(err));
          setOpen(true);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, minQueryLength, debounceMs, search]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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

  const empty = !loading && !error && query.trim().length >= minQueryLength && results.length === 0;
  const showDropdown = open && (loading || !!error || results.length > 0 || empty);

  function handleSelect(item: T) {
    setQuery(getItemText(item));
    setOpen(false);
    onSelect?.(item);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
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

  const resultNodes = useMemo(
    () =>
      results.map((item, index) => (
        <li
          key={getItemKey(item, index)}
          role="option"
          aria-selected={index === activeIndex}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => handleSelect(item)}
          className="search-dropdown-item cursor-pointer px-4 py-3 text-sm"
        >
          {renderItem(item, index === activeIndex)}
        </li>
      )),
    [results, getItemKey, activeIndex, renderItem, handleSelect]
  );

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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= minQueryLength && setOpen(true)}
          placeholder={placeholder}
          className="w-full gold-input pl-10 pr-10 py-2.5 text-sm rounded-xl"
          aria-label={ariaLabel}
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
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full search-dropdown rounded-xl overflow-hidden max-h-80 overflow-y-auto"
        >
          {loading && (
            <li className="px-4 py-3 text-sm text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
              Searching…
            </li>
          )}
          {error && !loading && (
            <li className="px-4 py-3 text-sm text-center text-red-400">{error}</li>
          )}
          {!loading && !error && empty && (
            <li className="px-4 py-3 text-sm text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
              {emptyText(query)}
            </li>
          )}
          {!loading && !error && resultNodes}
        </ul>
      )}
    </div>
  );
}
