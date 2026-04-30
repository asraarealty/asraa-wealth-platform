"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  fetchInsights,
  type Asset,
  type CreateAssetPayload,
  type UpdateAssetPayload,
  type InsightItem,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import ClientSelector from "./ClientSelector";
import PortfolioGrowthChart from "./dashboard/PortfolioGrowthChart";
import AllocationChart from "./dashboard/AllocationChart";
import AlertsPanel from "./admin/dashboard/AlertsPanel";
import ClientRecommendations from "./dashboard/ClientRecommendations";
import AssetTabs from "./dashboard/AssetTabs";
import StatBox from "./ui/StatBox";
import Loader from "./ui/Loader";
import ErrorState from "./ui/ErrorState";
import type { DashboardAlert } from "./admin/dashboard/AlertsPanel";

type Tab = "stocks" | "mutual_funds" | "real_estate";

/* ── helpers ──────────────────────────────────────────────────────── */

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function computeRiskScore(assets: Asset[]): number {
  if (assets.length === 0) return 0;
  const total = assets.reduce(
    (s, a) => s + (a.value ?? a.current_value ?? 0),
    0
  );
  if (total === 0) return 0;
  const equityVal = assets
    .filter((a) => a.type === "stock")
    .reduce((s, a) => s + (a.value ?? 0), 0);
  const equityPct = (equityVal / total) * 100;
  return Math.min(10, Math.max(1, Math.round(2 + (equityPct / 100) * 7)));
}

function insightsToAlerts(insights: InsightItem[]): DashboardAlert[] {
  return insights
    .filter((i) => i.type === "risk" || i.severity)
    .slice(0, 5)
    .map((i) => ({
      id: String(i.id),
      title: i.title,
      description: i.body,
      severity: (i.severity ?? (i.type === "risk" ? "high" : "medium")) as
        | "low"
        | "medium"
        | "high",
    }));
}

/* ── component ────────────────────────────────────────────────────── */

export default function Dashboard({ clientId }: { clientId?: string }) {
  const { logout, user } = useAuth();
  const isAdmin = String(user?.role).toLowerCase() === "admin";

  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stocks");

  const resolvedClientId = useMemo<number | undefined>(() => {
    if (!isAdmin) return undefined;
    if (clientId) return Number(clientId);
    return selectedClient?.id ?? undefined;
  }, [isAdmin, clientId, selectedClient]);

  const loadAssets = useCallback(async (id?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAssets(id);
      setAssets(data);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInsights = useCallback(async () => {
    try {
      const data = await fetchInsights();
      setInsights(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (isAdmin && resolvedClientId === undefined) return;
    loadAssets(resolvedClientId);
    loadInsights();
  }, [user, isAdmin, resolvedClientId, loadAssets, loadInsights]);

  const kpis = useMemo(() => {
    const netWorth = assets.reduce(
      (s, a) => s + (a.value ?? a.current_value ?? 0),
      0
    );
    const totalCost = assets.reduce((s, a) => {
      const cost =
        a.type === "real_estate"
          ? (a.purchase_price ?? 0)
          : (a.avg_price ?? 0) * (a.quantity ?? 1);
      return s + cost;
    }, 0);
    const returnPct =
      totalCost > 0 ? ((netWorth - totalCost) / totalCost) * 100 : 0;
    const monthlyIncome = assets
      .filter((a) => a.type === "real_estate")
      .reduce((s, a) => s + (a.rent_amount ?? 0), 0);
    const stockIncome = assets
      .filter((a) => a.type === "stock")
      .reduce((s, a) => s + (a.value ?? 0) * 0.005, 0);
    const riskScore = computeRiskScore(assets);

    const portfolioPositions = assets.map((a) => ({
      id: a.id,
      symbol: a.symbol ?? a.name.slice(0, 6).toUpperCase(),
      name: a.name,
      quantity: a.quantity ?? 1,
      avg_price: a.avg_price ?? a.purchase_price ?? 0,
      current_price: a.current_price ?? a.current_value ?? 0,
      value: a.value ?? a.current_value ?? 0,
      allocation: undefined,
    }));

    return {
      netWorth,
      totalCost,
      returnPct,
      monthlyIncome: monthlyIncome + stockIncome,
      riskScore,
      portfolioPositions,
    };
  }, [assets]);

  async function handleAdd(payload: CreateAssetPayload) {
    const body: CreateAssetPayload = {
      ...payload,
      ...(isAdmin && resolvedClientId ? { user_id: resolvedClientId } : {}),
    };
    await createAsset(body);
    loadAssets(resolvedClientId);
  }

  async function handleEdit(id: number, payload: UpdateAssetPayload) {
    await updateAsset(id, payload);
    loadAssets(resolvedClientId);
  }

  async function handleDelete(id: number) {
    await deleteAsset(id);
    loadAssets(resolvedClientId);
  }

  const alerts = useMemo(() => insightsToAlerts(insights), [insights]);

  return (
    <div className="min-h-screen text-white bg-[#071a14] p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {user?.name ?? user?.email ?? "Welcome back"}
            {isAdmin && (
              <span
                className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: "rgba(201,162,39,0.12)",
                  color: "#d4af4a",
                  border: "1px solid rgba(201,162,39,0.2)",
                }}
              >
                Admin
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
              style={{
                background: "rgba(201,162,39,0.15)",
                color: "#d4af4a",
                border: "1px solid rgba(201,162,39,0.25)",
              }}
              onClick={() => {
                window.location.href = "/admin/clients/new";
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
              </svg>
              Add Client
            </button>
          )}
          <button
            onClick={() => logout()}
            className="px-4 py-2 text-sm rounded-xl transition-colors text-gray-300 hover:text-white"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Admin client selector */}
      {isAdmin && !clientId && (
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-light mb-3">
            Select Client
          </p>
          <ClientSelector
            selectedId={selectedClient?.id ?? null}
            onChange={setSelectedClient}
          />
        </div>
      )}

      {/* Loading / Error */}
      {loading && <Loader />}
      {error && <ErrorState message={error} />}

      {/* Main content */}
      {!loading && !error && (isAdmin ? resolvedClientId !== undefined : true) && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              label="Net Worth"
              value={fmtCurrency(kpis.netWorth)}
              trend={kpis.returnPct >= 0 ? "up" : "down"}
              trendLabel={`${kpis.returnPct >= 0 ? "+" : ""}${kpis.returnPct.toFixed(1)}%`}
              subValue="total portfolio value"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              }
            />
            <StatBox
              label="Return %"
              value={`${kpis.returnPct >= 0 ? "+" : ""}${kpis.returnPct.toFixed(2)}%`}
              trend={kpis.returnPct >= 0 ? "up" : "down"}
              trendLabel={kpis.returnPct >= 0 ? "Profit" : "Loss"}
              subValue="all time"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
                </svg>
              }
            />
            <StatBox
              label="Monthly Income"
              value={fmtCurrency(kpis.monthlyIncome)}
              trend="neutral"
              subValue="rent + dividends"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              }
            />
            <StatBox
              label="Risk Score"
              value={`${kpis.riskScore} / 10`}
              trend={kpis.riskScore <= 4 ? "up" : kpis.riskScore <= 7 ? "neutral" : "down"}
              trendLabel={
                kpis.riskScore <= 3
                  ? "Conservative"
                  : kpis.riskScore <= 6
                  ? "Moderate"
                  : "Aggressive"
              }
              subValue="portfolio risk level"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              }
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <PortfolioGrowthChart
                totalValue={kpis.netWorth}
                gainPercent={kpis.returnPct}
              />
            </div>
            <AllocationChart positions={kpis.portfolioPositions} />
          </div>

          {/* Alerts + Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AlertsPanel
              alerts={
                alerts.length > 0
                  ? alerts
                  : assets.length > 0
                  ? []
                  : [
                      {
                        id: "welcome",
                        title: "Get started",
                        description:
                          "Add your first asset using the tabs below to unlock portfolio alerts.",
                        severity: "low",
                      },
                    ]
              }
            />
            <ClientRecommendations assets={assets} />
          </div>

          {/* Asset Tabs */}
          <AssetTabs
            assets={assets}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}

      {/* Admin: no client selected */}
      {!loading && !error && isAdmin && resolvedClientId === undefined && (
        <div
          className="glass-card rounded-2xl p-10 text-center"
          style={{ border: "1px solid rgba(201,162,39,0.15)" }}
        >
          <p className="text-gray-400 text-sm">
            Select a client above to view their portfolio.
          </p>
        </div>
      )}
    </div>
  );
}
