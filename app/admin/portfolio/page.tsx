"use client";

import { useEffect, useState } from "react";
import { getAdminPortfolio } from "@/lib/services/portfolioService";
import { toErrorMessage } from "@/lib/fetcher";
import type { AdminPortfolioItem } from "@/lib/api";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-100">Portfolio</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by symbol or name…"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="w-64 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-slate-400">No portfolio records found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} title={`${p.symbol} — ${p.name}`}>
              <p className="text-3xl font-bold text-slate-100">
                {fmt(p.value)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Portfolio item #{p.id}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

