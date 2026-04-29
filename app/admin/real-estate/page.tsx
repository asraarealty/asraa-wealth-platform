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

export default function RealEstatePage() {
  const [properties, setProperties] = useState<AdminPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    getAdminPortfolio(ac.signal)
      .then((items) => {
        // Real estate items have symbols starting with "PROP-"
        setProperties(items.filter((p) => p.symbol && p.symbol.startsWith("PROP-")));
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[RealEstatePage] Failed to load:", err);
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  const totalValue = properties.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    <div className="space-y-6 text-white">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#c9a227" }}>
          Real Estate
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {properties.length} propert{properties.length !== 1 ? "ies" : "y"} ·{" "}
          <span style={{ color: "#c9a227" }}>{fmt(totalValue)}</span> total value
        </p>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties"
          description="Add real estate positions to your portfolio to see them here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl p-6"
              style={{
                background: "rgba(11,61,46,0.6)",
                border: "1px solid rgba(201,162,39,0.2)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: "#c9a227" }}
                  >
                    {p.symbol}
                  </p>
                  <p className="text-sm text-gray-300 font-medium">{p.name}</p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(201,162,39,0.12)", color: "#c9a227" }}
                >
                  #{p.id}
                </span>
              </div>
              <p className="text-3xl font-bold text-white">{fmt(p.value)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <p className="mb-0.5">Qty</p>
                  <p className="text-gray-300 font-medium">{p.quantity}</p>
                </div>
                <div>
                  <p className="mb-0.5">Avg Price</p>
                  <p className="text-gray-300 font-medium">{fmt(p.avg_price)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
