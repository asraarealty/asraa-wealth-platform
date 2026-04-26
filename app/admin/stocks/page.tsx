"use client";

import { useEffect, useState } from "react";
import { searchStocks } from "@/lib/api";

export default function StocksPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await searchStocks("AAPL"); // test
        setStocks(data || []);
      } catch (err) {
        console.error("Stock load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="p-6 text-white">Loading stocks...</div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-semibold mb-4">Stocks</h1>

      {stocks.length === 0 ? (
        <p>No stocks found</p>
      ) : (
        <div className="grid gap-3">
          {stocks.map((stock: any, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-gray-900 border border-gray-800"
            >
              <div className="font-semibold">{stock.symbol}</div>
              <div className="text-sm text-gray-400">{stock.name}</div>
              <div className="text-sm mt-1">₹ {stock.price}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
