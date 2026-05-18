"use client";

export type { TickerQuote } from "@/domains/market/quotes";

export {
  normalizeTicker,
  fetchBulkQuotes,
  subscribeTicker,
  unsubscribeTicker,
  getOptimisticQuote,
} from "@/domains/market/quotes";

export function cacheQuote(_quote?: unknown) {
  // Legacy shim retained for compatibility; quote cache ownership moved to domains/market/quotes.
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn("[marketDataService] cacheQuote is deprecated; quote ownership moved to domains/market/quotes.");
  }
}
