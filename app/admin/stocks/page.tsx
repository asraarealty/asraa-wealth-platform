"use client";

import { useEffect, useState } from "react";
import { fetchStockQuote, type StockQuote } from "@/lib/api";

const SYMBOLS = ["AAPL", "MSFT", "TCS.NS", "RELIANCE.NS"];

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    async function loadStocks() {
      try {
        const results = await Promise.allSettled(
          SYMBOLS.map((sym) => fetchStockQuote(sym, ac.signal))
        );
        const quotes = results
          .filter(
            (r): r is PromiseFulfilledResult<StockQuote> =>
              r.status === "fulfilled"
          )
          .map((r) => r.value);
        if (quotes.length === 0 && results.every((r) => r.status === "rejected")) {
          setError("Failed to load stocks. Please try again later.");
        }
        setStocks(quotes);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Stock load error:", err);
        setError("Failed to load stocks. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadStocks();
    return () => ac.abort();
  }, []);

  if (loading) {
    return <div className="p-6 text-white">Loading stocks...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-semibold mb-6">Stocks</h1>

      {stocks.length === 0 ? (
        <p>No stocks found</p>
      ) : (
        <div className="grid gap-4">
          {stocks.map((s) => (
            <div
              key={s.symbol}
              className="p-4 rounded-xl bg-gray-900 border border-gray-800"
            >
              <div className="font-semibold text-lg">{s.name}</div>

              <div className="text-sm text-gray-400">{s.symbol}</div>

              <div className="mt-2 text-lg">₹ {s.price.toFixed(2)}</div>

              <div
                className={`text-sm mt-1 ${
                  s.change_percent >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {s.change_percent >= 0 ? "+" : ""}
                {s.change_percent.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
