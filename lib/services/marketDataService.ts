"use client";

export type { TickerQuote } from "@/domains/market/quotes";

export {
  normalizeTicker,
  fetchBulkQuotes,
  subscribeTicker,
  unsubscribeTicker,
  getOptimisticQuote,
} from "@/domains/market/quotes";

export function cacheQuote() {
  // Legacy shim retained for compatibility; quote cache ownership moved to domains/market/quotes.
}
