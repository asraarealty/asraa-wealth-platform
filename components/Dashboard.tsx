"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, isAuthenticated, msUntilExpiry } from "@/lib/auth";
import {
  fetchPortfolio,
  type Client,
  type PortfolioSummary,
  type StockQuote,
} from "@/lib/api";
import ClientSelector from "./ClientSelector";
import StockSearch from "./StockSearch";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}

function StatCard({ label, value, sub, positive }: StatCardProps) {
  const subColor =
    positive === undefined
      ? "text-gray-400"
      : positive
      ? "text-emerald-400"
      : "text-red-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  const loadPortfolio = useCallback(async (clientId: string, signal?: AbortSignal) => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const data = await fetchPortfolio(clientId, signal);
      setPortfolio(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPortfolioError(
        err instanceof Error ? err.message : "Failed to load portfolio"
      );
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    const controller = new AbortController();
    loadPortfolio(selectedClient.id, controller.signal);
    return () => controller.abort();
  }, [selectedClient, loadPortfolio]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  function handleClientChange(client: Client) {
    setSelectedClient(client);
    setPortfolio(null);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle client list"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-emerald-400">Asraa</span> Wealth
            </span>
          </div>

          <div className="hidden sm:flex flex-1 max-w-sm mx-6">
            <StockSearch onSelect={setSelectedStock} />
          </div>

          <div className="flex items-center gap-2">
            {selectedClient && (
              <span className="hidden sm:block text-sm text-gray-400 truncate max-w-32">
                {selectedClient.name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
                />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <StockSearch onSelect={setSelectedStock} />
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 gap-6">
        {/* Sidebar — client list */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto
            transition-transform duration-300
            lg:static lg:block lg:w-72 lg:rounded-2xl lg:translate-x-0 lg:border lg:border-gray-800
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {sidebarOpen && (
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <span className="text-sm font-semibold text-gray-300">
                Clients
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          <p className="hidden lg:block text-xs text-gray-400 uppercase tracking-wider mb-3">
            Clients
          </p>
          <ClientSelector
            selectedId={selectedClient?.id ?? null}
            onChange={handleClientChange}
          />
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Selected stock banner */}
          {selectedStock && (
            <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {selectedStock.symbol.slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {selectedStock.symbol}
                    <span className="ml-2 font-normal text-sm text-gray-400">
                      {selectedStock.name}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Vol:{" "}
                    {new Intl.NumberFormat("en-US", {
                      notation: "compact",
                    }).format(selectedStock.volume)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">
                  {formatCurrency(selectedStock.price)}
                </p>
                <p
                  className={`text-sm font-medium ${
                    selectedStock.change_percent >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {formatPercent(selectedStock.change_percent)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="ml-4 text-gray-500 hover:text-gray-300 transition"
                aria-label="Dismiss"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                Select a client to view their portfolio
              </p>
              <button
                className="lg:hidden mt-2 text-emerald-400 text-sm underline underline-offset-2"
                onClick={() => setSidebarOpen(true)}
              >
                Open client list
              </button>
            </div>
          ) : portfolioLoading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
              <svg
                className="animate-spin h-5 w-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading portfolio…
            </div>
          ) : portfolioError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-red-400 text-sm">{portfolioError}</p>
              <button
                onClick={() => loadPortfolio(selectedClient.id)}
                className="text-emerald-400 text-sm underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          ) : portfolio ? (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Portfolio Value"
                  value={formatCurrency(portfolio.total_value)}
                />
                <StatCard
                  label="Total Gain / Loss"
                  value={formatCurrency(portfolio.total_gain_loss)}
                  sub={formatPercent(portfolio.total_gain_loss_percent)}
                  positive={portfolio.total_gain_loss >= 0}
                />
                <StatCard
                  label="Day Change"
                  value={formatCurrency(portfolio.day_gain_loss)}
                  sub={formatPercent(portfolio.day_gain_loss_percent)}
                  positive={portfolio.day_gain_loss >= 0}
                />
                <StatCard
                  label="Positions"
                  value={String(portfolio.positions.length)}
                />
              </div>

              {/* Positions table */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800">
                  <h2 className="font-semibold text-white text-sm">
                    Holdings
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                        <th className="px-5 py-3 text-left font-medium">
                          Symbol
                        </th>
                        <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">
                          Qty
                        </th>
                        <th className="px-5 py-3 text-right font-medium hidden md:table-cell">
                          Avg Cost
                        </th>
                        <th className="px-5 py-3 text-right font-medium">
                          Price
                        </th>
                        <th className="px-5 py-3 text-right font-medium">
                          Value
                        </th>
                        <th className="px-5 py-3 text-right font-medium">
                          G / L
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {portfolio.positions.map((pos) => (
                        <tr
                          key={pos.symbol}
                          className="hover:bg-gray-800/40 transition"
                        >
                          <td className="px-5 py-3">
                            <div className="font-semibold text-white">
                              {pos.symbol}
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-28">
                              {pos.name}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-300 hidden sm:table-cell">
                            {pos.quantity}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-300 hidden md:table-cell">
                            {formatCurrency(pos.avg_cost)}
                          </td>
                          <td className="px-5 py-3 text-right text-white">
                            {formatCurrency(pos.current_price)}
                          </td>
                          <td className="px-5 py-3 text-right text-white font-medium">
                            {formatCurrency(pos.market_value)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div
                              className={`font-medium ${
                                pos.gain_loss >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {formatCurrency(pos.gain_loss)}
                            </div>
                            <div
                              className={`text-xs ${
                                pos.gain_loss_percent >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {formatPercent(pos.gain_loss_percent)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
