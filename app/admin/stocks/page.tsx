"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";

export default function StocksPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStocks() {
      try {
        const res = await fetcher<any>("/api/v2/stocks/bulk", {
          method: "POST",
          body: {
            symbols: ["AAPL", "MSFT", "TCS.NS", "RELIANCE.NS"],
          },
        });

        setStocks(res.quotes || []);
      } catch (err) {
        console.error("Stock load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStocks();
  }, []);

  if (loading) {
    return <div className="p-6 text-white">Loading stocks...</div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-semibold mb-6">Stocks</h1>

      {stocks.length === 0 ? (
        <p>No stocks found</p>
      ) : (
        <div className="grid gap-4">
          {stocks.map((s: any) => (
            <div
              key={s.symbol}
              className="p-4 rounded-xl bg-gray-900 border border-gray-800"
            >
              <div className="font-semibold text-lg">
                {s.company_name}
              </div>

              <div className="text-sm text-gray-400">
                {s.normalized_symbol}
              </div>

              <div className="mt-2 text-lg">
                ₹ {s.price_inr.toFixed(2)}
              </div>

              <div
                className={`text-sm mt-1 ${
                  s.day_change_pct >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {s.day_change_pct}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
