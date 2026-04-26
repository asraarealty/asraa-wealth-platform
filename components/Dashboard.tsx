"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolioItems } from "@/lib/services/portfolioService";
import { toErrorMessage } from "@/lib/fetcher";
import ClientSelector from "./ClientSelector";
import StockSearch from "./StockSearch";
import PortfolioGrowthChart from "./dashboard/PortfolioGrowthChart";
import AllocationChart from "./dashboard/AllocationChart";
import AIInsightsPanel from "./dashboard/AIInsightsPanel";

/* ✅ SAFE LOCAL TYPES (fixes build crash) */
type Client = any;
type Portfolio = any;
type PortfolioMeta = any;
type StockQuote = any;

/* ─── Helpers ─── */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/* ─── KPI LOGIC ─── */

function computeKPIs(items: Portfolio[]) {
  const totalValue = items.reduce((s, p) => s + p.value, 0);
  const totalCost = items.reduce((s, p) => s + p.avg_price * p.quantity, 0);
  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return {
    totalValue,
    totalCost,
    totalGain,
    gainPercent,
    positionCount: items.length,
  };
}

/* ─── MAIN COMPONENT ─── */

export default function Dashboard() {
  const { logout } = useAuth();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [portfolioMeta, setPortfolioMeta] = useState<Partial<PortfolioMeta>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  const kpis = useMemo(() => computeKPIs(portfolio), [portfolio]);

  const loadPortfolio = useCallback(async (clientId: number) => {
    setLoading(true);
    setError(null);

    try {
      const { items, meta } = await getPortfolioItems(clientId);
      setPortfolio(items);
      setPortfolioMeta(meta);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    loadPortfolio(selectedClient.id);
  }, [selectedClient, loadPortfolio]);

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-screen text-white bg-[#071a14] p-6 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-white/20 rounded"
        >
          Logout
        </button>
      </div>

      {/* Client selector */}
      <ClientSelector
        selectedId={selectedClient?.id ?? null}
        onChange={setSelectedClient}
      />

      {/* Stock search */}
      <StockSearch onSelect={setSelectedStock} />

      {/* Selected stock */}
      {selectedStock && (
        <div className="p-4 border border-yellow-500 rounded">
          {selectedStock.symbol} — {formatCurrency(selectedStock.price)}
        </div>
      )}

      {/* Loading */}
      {loading && <p>Loading...</p>}

      {/* Error */}
      {error && <p className="text-red-400">{error}</p>}

      {/* Data */}
      {portfolio.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>Total Value: {formatCurrency(kpis.totalValue)}</div>
            <div>Return: {formatPercent(kpis.gainPercent)}</div>
            <div>Invested: {formatCurrency(kpis.totalCost)}</div>
            <div>Holdings: {kpis.positionCount}</div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PortfolioGrowthChart
              totalValue={kpis.totalValue}
              gainPercent={kpis.gainPercent}
            />
            <AllocationChart positions={portfolio} />
          </div>

          {/* AI */}
          <AIInsightsPanel />
        </>
      )}
    </div>
  );
}
