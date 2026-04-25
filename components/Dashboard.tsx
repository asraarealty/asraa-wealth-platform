"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolioItems } from "@/lib/services/portfolioService";
import { toErrorMessage } from "@/lib/fetcher";
import type { Client, Portfolio, PortfolioMeta, StockQuote } from "@/lib/api";
import ClientSelector from "./ClientSelector";
import StockSearch from "./StockSearch";
import PortfolioGrowthChart from "./dashboard/PortfolioGrowthChart";
import AllocationChart from "./dashboard/AllocationChart";
import AIInsightsPanel from "./dashboard/AIInsightsPanel";

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

// ─── KPI helpers derived from Portfolio[] ─────────────────────────────────────

interface PortfolioKPIs {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  gainPercent: number;
  positionCount: number;
}

/** Compute gain/loss for a single Portfolio position. */
function positionGainLoss(pos: Portfolio): { gainLoss: number; gainLossPct: number } {
  const gainLoss = (pos.current_price - pos.avg_price) * pos.quantity;
  const gainLossPct =
    pos.avg_price > 0 ? ((pos.current_price - pos.avg_price) / pos.avg_price) * 100 : 0;
  return { gainLoss, gainLossPct };
}

function computeKPIs(items: Portfolio[]): PortfolioKPIs {
  const totalValue = items.reduce((s, p) => s + p.value, 0);
  const totalCost = items.reduce((s, p) => s + p.avg_price * p.quantity, 0);
  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  return { totalValue, totalCost, totalGain, gainPercent, positionCount: items.length };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  icon: React.ReactNode;
}

function KPICard({ label, value, sub, positive, icon }: KPICardProps) {
  const subColor =
    positive === undefined
      ? "text-gray-400"
      : positive
      ? "text-emerald-400"
      : "text-red-400";

  return (
    <div
      className="glass-card card-hover rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
      }}
    >
      {/* Corner radial glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(201,162,39,0.1) 0%, transparent 70%)",
        }}
      />
      {/* Bottom edge accent */}
      <div
        className="absolute bottom-0 left-5 right-5 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.2), transparent)" }}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(201,162,39,0.65)" }}>
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(201,162,39,0.1)",
            border: "1px solid rgba(201,162,39,0.18)",
            boxShadow: "0 0 10px rgba(201,162,39,0.08)",
          }}
        >
          {icon}
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {sub && (
          <p className={`text-xs mt-1.5 font-medium ${subColor}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconPortfolio = (
  <svg className="w-4 h-4 text-gold-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
  </svg>
);

const IconGrowth = (
  <svg className="w-4 h-4 text-gold-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
  </svg>
);

const IconClients = (
  <svg className="w-4 h-4 text-gold-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const IconAUM = (
  <svg className="w-4 h-4 text-gold-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────

function GoldSpinner() {
  return (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" style={{ color: "#c9a227" }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { logout } = useAuth();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [portfolioMeta, setPortfolioMeta] = useState<Partial<PortfolioMeta>>({});
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  // Derived KPIs from real API data
  const kpis = useMemo(() => computeKPIs(portfolio), [portfolio]);

  const loadPortfolio = useCallback(
    async (clientId: number, signal?: AbortSignal) => {
      setPortfolioLoading(true);
      setPortfolioError(null);
      try {
        const { items, meta } = await getPortfolioItems(clientId, signal);
        setPortfolio(items);
        setPortfolioMeta(meta);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPortfolioError(toErrorMessage(err));
      } finally {
        setPortfolioLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedClient) return;
    const controller = new AbortController();
    loadPortfolio(selectedClient.id, controller.signal);
    return () => controller.abort();
  }, [selectedClient, loadPortfolio]);

  async function handleLogout() {
    await logout();
  }

  function handleClientChange(client: Client) {
    setSelectedClient(client);
    setPortfolio([]);
    setPortfolioMeta({});
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#071a14" }}>
      {/* ── Topbar (glass) ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: "rgba(7,26,20,0.88)",
          borderBottom: "1px solid rgba(201,162,39,0.12)",
          boxShadow: "0 2px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(201,162,39,0.06)",
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo + mobile toggle */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg transition"
              style={{ color: "#c9a227" }}
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle client list"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Brand mark */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                style={{
                  background: "linear-gradient(135deg, #c9a227 0%, #8b6914 100%)",
                  boxShadow: "0 0 12px rgba(201,162,39,0.4)",
                  color: "#0b3d2e",
                }}
              >
                AW
              </div>
              <span className="font-bold text-base tracking-tight hidden sm:block">
                <span style={{ color: "#c9a227" }}>Asraa</span>{" "}
                <span className="text-white/80">Wealth</span>
              </span>
            </div>
          </div>

          {/* Stock search */}
          <div className="hidden sm:flex flex-1 max-w-sm mx-6">
            <StockSearch onSelect={setSelectedStock} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {selectedClient && (
              <div className="hidden md:flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(201,162,39,0.2)", color: "#c9a227" }}
                >
                  {selectedClient.name.charAt(0)}
                </div>
                <span className="text-sm text-white/70 truncate max-w-32">
                  {selectedClient.name}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm transition px-3 py-1.5 rounded-lg"
              style={{
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#c9a227";
                e.currentTarget.style.borderColor = "rgba(201,162,39,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
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

      <div className="flex flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 gap-6">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-72 p-4 overflow-y-auto transition-transform duration-300
            lg:static lg:block lg:w-72 lg:rounded-2xl lg:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          style={{
            background: "rgba(11,42,32,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(201,162,39,0.13)",
            boxShadow: "4px 0 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#c9a227" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#c9a227" }}>
                Clients
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded transition text-white/40 hover:text-white/80"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ClientSelector
            selectedId={selectedClient?.id ?? null}
            onChange={handleClientChange}
          />
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Stock quote banner */}
          {selectedStock && (
            <div
              className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{
                    background: "rgba(201,162,39,0.15)",
                    border: "1px solid rgba(201,162,39,0.25)",
                    color: "#c9a227",
                    boxShadow: "0 0 12px rgba(201,162,39,0.15)",
                  }}
                >
                  {selectedStock.symbol.slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {selectedStock.symbol}
                    <span className="ml-2 font-normal text-sm text-white/50">
                      {selectedStock.name}
                    </span>
                  </p>
                  <p className="text-xs text-white/40">
                    Vol:{" "}
                    {new Intl.NumberFormat("en-US", { notation: "compact" }).format(selectedStock.volume)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">{formatCurrency(selectedStock.price)}</p>
                <p
                  className={`text-sm font-medium ${
                    selectedStock.change_percent >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatPercent(selectedStock.change_percent)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="text-white/30 hover:text-white/70 transition ml-2"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center text-center py-24 gap-5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(201,162,39,0.08)",
                  border: "1px solid rgba(201,162,39,0.18)",
                  boxShadow: "0 0 40px rgba(201,162,39,0.08)",
                }}
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#c9a227" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Select a client</p>
                <p className="text-white/40 text-sm">
                  Choose a client from the sidebar to view their wealth portfolio
                </p>
              </div>
              <button
                className="lg:hidden text-sm font-medium px-4 py-2 rounded-lg transition"
                style={{
                  background: "rgba(201,162,39,0.15)",
                  border: "1px solid rgba(201,162,39,0.3)",
                  color: "#c9a227",
                }}
                onClick={() => setSidebarOpen(true)}
              >
                Open client list
              </button>
            </div>
          ) : portfolioLoading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-white/50">
              <GoldSpinner />
              Loading portfolio…
            </div>
          ) : portfolioError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-red-400 text-sm">{portfolioError}</p>
              <button
                onClick={() => loadPortfolio(selectedClient.id)}
                className="text-sm font-medium px-4 py-2 rounded-lg transition"
                style={{
                  background: "rgba(201,162,39,0.15)",
                  border: "1px solid rgba(201,162,39,0.3)",
                  color: "#c9a227",
                }}
              >
                Retry
              </button>
            </div>
          ) : portfolio.length > 0 ? (
            <>
              {/* ── KPI Cards — prefer backend meta values, fall back to local computation ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Portfolio Value"
                  value={formatCurrency(portfolioMeta.total_value ?? kpis.totalValue)}
                  sub={kpis.gainPercent >= 0 ? "↑ Positive trend" : "↓ Negative trend"}
                  positive={kpis.gainPercent >= 0}
                  icon={IconPortfolio}
                />
                <KPICard
                  label="Total Return"
                  value={formatPercent(portfolioMeta.roi_percent ?? kpis.gainPercent)}
                  sub={formatCurrency(kpis.totalGain)}
                  positive={kpis.totalGain >= 0}
                  icon={IconGrowth}
                />
                <KPICard
                  label="Invested Capital"
                  value={formatCurrency(kpis.totalCost)}
                  sub="Cost basis"
                  icon={IconAUM}
                />
                <KPICard
                  label="Active Holdings"
                  value={String(kpis.positionCount)}
                  sub="Diversified positions"
                  icon={IconClients}
                />
              </div>

              {/* ── Charts row — bound to real Portfolio[] data ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <PortfolioGrowthChart
                    totalValue={kpis.totalValue}
                    gainPercent={kpis.gainPercent}
                  />
                </div>
                <AllocationChart positions={portfolio} />
              </div>

              {/* ── Holdings table + AI Insights ── */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Holdings table */}
                <div
                  className="xl:col-span-2 glass-card rounded-2xl overflow-hidden"
                >
                  <div
                    className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(201,162,39,0.12)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#c9a227" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                      </svg>
                      <h2 className="font-semibold text-white text-sm">Portfolio Holdings</h2>
                    </div>
                    <span className="badge-premium">{portfolio.length} Positions</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="text-xs uppercase tracking-widest"
                          style={{
                            borderBottom: "1px solid rgba(201,162,39,0.08)",
                            color: "rgba(201,162,39,0.55)",
                            background: "rgba(201,162,39,0.02)",
                          }}
                        >
                          <th className="px-5 py-3 text-left font-semibold">Asset</th>
                          <th className="px-5 py-3 text-right font-semibold hidden sm:table-cell">Qty</th>
                          <th className="px-5 py-3 text-right font-semibold hidden md:table-cell">Avg Price</th>
                          <th className="px-5 py-3 text-right font-semibold">Price</th>
                          <th className="px-5 py-3 text-right font-semibold">Value</th>
                          <th className="px-5 py-3 text-right font-semibold">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.map((pos, idx) => {
                          const { gainLoss, gainLossPct } = positionGainLoss(pos);
                          const isTopPick = idx < 3;
                          const alloc = pos.allocation ?? 0;
                          return (
                            <tr
                              key={pos.id}
                              className="transition-all duration-200"
                              style={{
                                borderBottom:
                                  idx < portfolio.length - 1
                                    ? "1px solid rgba(255,255,255,0.035)"
                                    : "none",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(201,162,39,0.06)";
                                e.currentTarget.style.boxShadow = "inset 0 0 20px rgba(201,162,39,0.03)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{
                                      background: isTopPick
                                        ? "linear-gradient(135deg, rgba(201,162,39,0.2) 0%, rgba(201,162,39,0.06) 100%)"
                                        : "rgba(255,255,255,0.05)",
                                      border: isTopPick
                                        ? "1px solid rgba(201,162,39,0.3)"
                                        : "1px solid rgba(255,255,255,0.08)",
                                      color: isTopPick ? "#c9a227" : "rgba(255,255,255,0.5)",
                                      boxShadow: isTopPick ? "0 0 10px rgba(201,162,39,0.1)" : "none",
                                    }}
                                  >
                                    {pos.symbol.slice(0, 2)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-white text-sm">{pos.symbol}</span>
                                      {isTopPick && (
                                        <span className="badge-premium">Top Pick</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-xs text-white/35 truncate max-w-24">{pos.name}</span>
                                      {alloc > 0 && (
                                        <span
                                          className="text-xs shrink-0"
                                          style={{ color: "rgba(201,162,39,0.5)" }}
                                        >
                                          {alloc.toFixed(1)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right text-white/55 hidden sm:table-cell">
                                {pos.quantity}
                              </td>
                              <td className="px-5 py-3.5 text-right text-white/55 hidden md:table-cell">
                                {formatCurrency(pos.avg_price)}
                              </td>
                              <td className="px-5 py-3.5 text-right text-white font-medium">
                                {formatCurrency(pos.current_price)}
                              </td>
                              <td className="px-5 py-3.5 text-right text-white font-semibold">
                                {formatCurrency(pos.value)}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div
                                  className="inline-flex flex-col items-end gap-0.5 px-2.5 py-1 rounded-lg"
                                  style={{
                                    background: gainLoss >= 0
                                      ? "rgba(16,185,129,0.08)"
                                      : "rgba(239,68,68,0.08)",
                                    border: gainLoss >= 0
                                      ? "1px solid rgba(16,185,129,0.15)"
                                      : "1px solid rgba(239,68,68,0.15)",
                                  }}
                                >
                                  <span
                                    className={`font-semibold text-xs ${
                                      gainLoss >= 0 ? "text-emerald-400" : "text-red-400"
                                    }`}
                                  >
                                    {formatPercent(gainLossPct)}
                                  </span>
                                  <span
                                    className={`text-xs ${
                                      gainLoss >= 0 ? "text-emerald-400/70" : "text-red-400/70"
                                    }`}
                                  >
                                    {formatCurrency(gainLoss)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Insights */}
                <AIInsightsPanel />
              </div>
            </>
          ) : (
            // Client selected but returned empty portfolio
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/40">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
              <p className="text-sm">No portfolio data for this client</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
