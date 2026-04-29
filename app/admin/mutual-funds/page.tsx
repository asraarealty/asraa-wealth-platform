"use client";

import { useEffect, useState } from "react";
import { getAdminPortfolio } from "@/lib/services/portfolioService";
import { toErrorMessage } from "@/lib/fetcher";
import type { AdminPortfolioItem } from "@/lib/api";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export default function MutualFundsPage() {
  const [funds, setFunds] = useState<AdminPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    getAdminPortfolio(ac.signal)
      .then((items) => {
        // Mutual funds have numeric-only symbols (e.g. AMFI codes like 120503)
        setFunds(items.filter((p) => /^\d+$/.test(p.symbol)));
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[MutualFundsPage] Failed to load:", err);
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  const totalValue = funds.reduce((sum, f) => sum + (f.value ?? 0), 0);

  return (
    <div className="space-y-6 text-white">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#c9a227" }}>
          Mutual Funds
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {funds.length} fund{funds.length !== 1 ? "s" : ""} ·{" "}
          <span style={{ color: "#c9a227" }}>{fmt(totalValue)}</span> total value
        </p>
      </div>

      {funds.length === 0 ? (
        <EmptyState
          title="No mutual funds"
          description="Add mutual fund positions to your portfolio to see them here."
        />
      ) : (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Fund</th>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Avg Price</th>
                <th className="px-4 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((f) => (
                <tr key={f.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-white font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-gray-400">{f.symbol}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{f.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt(f.avg_price)}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "#c9a227" }}>
                    {fmt(f.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
