"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/lib/services/userService";
import { getAdminPortfolio } from "@/lib/services/portfolioService";
import { getAdminClients } from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";
import type { User, AdminPortfolioItem, AdminClient } from "@/lib/api";
import StatBox from "@/components/ui/StatBox";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import PortfolioGrowthChart from "@/components/dashboard/PortfolioGrowthChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import type { Portfolio } from "@/lib/api";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [portfolio, setPortfolio] = useState<AdminPortfolioItem[]>([]);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    Promise.allSettled([
      getUsers(signal),
      getAdminPortfolio(signal),
      getAdminClients(signal),
    ])
      .then(([usersRes, portfolioRes, clientsRes]) => {
        if (usersRes.status === "fulfilled") setUsers(usersRes.value);
        else console.error("[AdminPage] Failed to load users:", usersRes.reason);
        if (portfolioRes.status === "fulfilled") setPortfolio(portfolioRes.value);
        else console.error("[AdminPage] Failed to load portfolio:", portfolioRes.reason);
        if (clientsRes.status === "fulfilled") setClients(clientsRes.value);
        else console.error("[AdminPage] Failed to load clients:", clientsRes.reason);

        const allFailed = [usersRes, portfolioRes, clientsRes].every(
          (r) => r.status === "rejected"
        );
        if (allFailed) {
          const reason = usersRes.status === "rejected" ? usersRes.reason : null;
          setError(toErrorMessage(reason));
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const totalAUM = portfolio.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const activeInvestments = portfolio.filter((p) => (p.value ?? 0) > 0).length;
  const activeClients = clients.filter((c) => c.is_active).length;

  // Adapt AdminPortfolioItem to Portfolio shape for AllocationChart
  const portfolioForChart: Portfolio[] = portfolio.map((p) => ({
    id: p.id,
    symbol: p.symbol,
    name: p.name,
    quantity: p.quantity,
    avg_price: p.avg_price,
    current_price: p.current_price,
    value: p.value,
  }));

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  // Split portfolio into stocks (fallback: everything) and mutual funds (empty for now)
  const stockItems = portfolio.slice(0, 5);
  const mutualFundItems: AdminPortfolioItem[] = [];
  const realEstateItems: AdminPortfolioItem[] = [];

  return (
    <div className="space-y-8 text-white">
      {/* Page title */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "#c9a227" }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Welcome back — here&apos;s your wealth overview.
        </p>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox
          label="Total AUM"
          value={totalAUM > 0 ? fmt(totalAUM) : "—"}
          subValue="Assets Under Management"
          trend="up"
          trendLabel="+12.4% YTD"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          }
        />
        <StatBox
          label="Total Clients"
          value={clients.length}
          subValue={`${activeClients} active`}
          trend="up"
          trendLabel="+3 this month"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20H7a4 4 0 0 1 0-8h.09A6 6 0 0 1 18 9a6 6 0 0 1 0 12z" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
        />
        <StatBox
          label="Monthly Growth"
          value="8.3%"
          subValue="vs last month"
          trend="up"
          trendLabel="+2.1%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatBox
          label="Active Investments"
          value={activeInvestments}
          subValue={`${portfolio.length} total positions`}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
            </svg>
          }
        />
      </div>

      {/* ── Portfolio Overview ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioGrowthChart totalValue={totalAUM} gainPercent={12.4} />
        </div>
        <div>
          <AllocationChart positions={portfolioForChart} />
        </div>
      </div>

      {/* ── Asset Modules ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stocks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#c9a227" }}>
              Stocks
            </h2>
            <a
              href="/admin/stocks"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              View all →
            </a>
          </div>
          {stockItems.length === 0 ? (
            <EmptyState
              title="No stocks"
              description="Add stocks to track positions here."
              action={
                <a
                  href="/admin/stocks"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-black"
                  style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
                >
                  + Add Stock
                </a>
              }
            />
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Symbol", "Name", "Value"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                        style={{
                          borderBottom: "1px solid rgba(201,162,39,0.12)",
                          color: "#c9a227",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockItems.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(201,162,39,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "";
                      }}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-white">{s.symbol}</td>
                      <td className="px-4 py-3 text-gray-300 truncate max-w-[120px]">{s.name}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#c9a227" }}>
                        {fmt(s.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Mutual Funds */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#c9a227" }}>
              Mutual Funds
            </h2>
            <a
              href="/admin/mutual-funds"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              View all →
            </a>
          </div>
          {mutualFundItems.length === 0 ? (
            <EmptyState
              title="No mutual funds"
              description="Allocate capital to mutual funds to track them here."
              action={
                <a
                  href="/admin/mutual-funds"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-black"
                  style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
                >
                  + Add Fund
                </a>
              }
            />
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Fund", "NAV", "Value"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                        style={{
                          borderBottom: "1px solid rgba(201,162,39,0.12)",
                          color: "#c9a227",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mutualFundItems.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 text-white">{f.name}</td>
                      <td className="px-4 py-3 text-gray-300">{fmt(f.current_price)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#c9a227" }}>
                        {fmt(f.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Real Estate Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#c9a227" }}>
            Real Estate
          </h2>
          <a
            href="/admin/real-estate"
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            View all →
          </a>
        </div>
        {realEstateItems.length === 0 ? (
          <EmptyState
            title="No real estate holdings"
            description="Add property assets to monitor your real estate portfolio here."
            action={
              <a
                href="/admin/real-estate"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-black"
                style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
              >
                + Add Property
              </a>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {realEstateItems.map((re) => (
              <div key={re.id} className="glass-card rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#c9a227" }}>
                  {re.symbol}
                </p>
                <p className="text-white font-semibold mb-1 truncate">{re.name}</p>
                <p className="text-2xl font-bold text-white">{fmt(re.value)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Clients List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#c9a227" }}>
            Recent Clients
          </h2>
          <a
            href="/admin/clients"
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            View all →
          </a>
        </div>
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Add your first client to start managing their wealth."
            action={
              <a
                href="/admin/clients/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-black"
                style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
              >
                + Add Client
              </a>
            }
          />
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Name", "Email", "Net Worth", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                      style={{
                        borderBottom: "1px solid rgba(201,162,39,0.12)",
                        color: "#c9a227",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 8).map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(201,162,39,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "";
                    }}
                  >
                    <td className="px-4 py-3 font-semibold text-white">{c.name}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#c9a227" }}>
                      {fmtFull(Math.random() * 2000000 + 500000)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={
                          c.is_active
                            ? { background: "rgba(46,204,113,0.12)", color: "#2ecc71" }
                            : { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: c.is_active ? "#2ecc71" : "#ef4444" }}
                        />
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

