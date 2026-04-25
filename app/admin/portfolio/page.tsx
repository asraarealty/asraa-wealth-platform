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

export default function PortfolioPage() {
  const [items, setItems] = useState<AdminPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    getAdminPortfolio(ac.signal)
      .then(setItems)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[PortfolioPage] Failed to load portfolio:", err);
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  const filtered = filterClient
    ? items.filter((p) =>
        p.symbol.toLowerCase().includes(filterClient.toLowerCase()) ||
        p.name.toLowerCase().includes(filterClient.toLowerCase())
      )
    : items;

  const totalValue = items.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#c9a227" }}>
            Portfolio
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {items.length} position{items.length !== 1 ? "s" : ""} ·{" "}
            <span style={{ color: "#c9a227" }}>{fmt(totalValue)}</span> total value
          </p>
        </div>
        <a
          href="/admin/portfolio/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-black transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, #C9A227, #d4af4a)",
            boxShadow: "0 2px 10px rgba(201,162,39,0.3)",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Position
        </a>
      </div>

      <div>
        <div className="relative w-64">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="rgba(201,162,39,0.5)"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filter by symbol or name…"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1"
            style={{
              background: "rgba(11,61,46,0.6)",
              border: "1px solid rgba(201,162,39,0.2)",
            }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No portfolio records found"
          description={filterClient ? "Try a different filter." : "Add your first position to get started."}
          action={
            !filterClient ? (
              <a
                href="/admin/portfolio/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-black"
                style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
              >
                + Add Position
              </a>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="glass-card rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#c9a227" }}>
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

