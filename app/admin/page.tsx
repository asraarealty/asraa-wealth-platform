"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminClients } from "@/lib/services/clientService";
import {
  fetchAdminGroupedAssets,
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  type AdminClient,
  type Asset,
  type AssetsAllocation,
  type CreateAssetPayload,
  type UpdateAssetPayload,
  type Client,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { useToast } from "@/context/ToastContext";
import StatBox from "@/components/ui/StatBox";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import PortfolioGrowthChart from "@/components/dashboard/PortfolioGrowthChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import ClientSelector from "@/components/ClientSelector";
import AssetTabs from "@/components/dashboard/AssetTabs";
import AlertsPanel from "@/components/admin/dashboard/AlertsPanel";
import RecommendationCard from "@/components/admin/dashboard/RecommendationCard";
import {
  type ClientIntelligence,
  type RiskLevel,
  type SuggestedAction,
  deriveAlerts,
  calcAverageReturn,
} from "@/components/admin/dashboard/intelligenceHelpers";
import { deriveAllocationFromValues } from "@/lib/utils/portfolioMath";

type Tab = "stocks" | "mutual_funds" | "real_estate";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export default function AdminPage() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [groupedAssets, setGroupedAssets] = useState<Record<string, Asset[]>>({});
  const [activeTab, setActiveTab] = useState<Tab>("stocks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getAdminClients(ac.signal)
      .then(async (clientData) => {
        setClients(clientData);
        const userIds = clientData.map((c: AdminClient) => c.id);
        const grouped = await fetchAdminGroupedAssets(userIds, ac.signal);
        setGroupedAssets(grouped);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const allAssets = useMemo(
    () => Object.values(groupedAssets).flat(),
    [groupedAssets]
  );

  const totalAUM = useMemo(
    () => allAssets.reduce((s: number, a: Asset) => s + (a.value ?? 0), 0),
    [allAssets]
  );

  const allocation = useMemo<AssetsAllocation | undefined>(() => {
    if (totalAUM === 0) return undefined;
    const stockValue = allAssets
      .filter((a: Asset) => a.type === "stock")
      .reduce((s: number, a: Asset) => s + (a.value ?? 0), 0);
    const mfValue = allAssets
      .filter((a: Asset) => a.type === "mf")
      .reduce((s: number, a: Asset) => s + (a.value ?? 0), 0);
    const propertyValue = allAssets
      .filter((a: Asset) => a.type === "property")
      .reduce((s: number, a: Asset) => s + (a.value ?? 0), 0);
    return deriveAllocationFromValues({ stockValue, mfValue, propertyValue, totalValue: totalAUM });
  }, [allAssets, totalAUM]);

  const activeClients = clients.filter((c: AdminClient) => c.isActive).length;
  const assets: Asset[] = groupedAssets[String(selectedClient?.id ?? "")] ?? [];

  // Intelligence rows derived from clients + grouped assets
  const intelligenceRows = useMemo<ClientIntelligence[]>(() => {
    return clients.map((client) => {
      const clientAssets = groupedAssets[String(client.id)] ?? [];
      const totalVal = clientAssets.reduce((s, a) => s + (a.value ?? 0), 0);
      const totalInvested = clientAssets.reduce((s, a) => s + ((a.quantity ?? 0) * (a.avgPrice ?? 0)), 0);
      const returnPct = totalInvested > 0 ? parseFloat(((totalVal - totalInvested) / totalInvested * 100).toFixed(1)) : 0;
      const stockVal = clientAssets.filter(a => a.type === "stock").reduce((s, a) => s + (a.value ?? 0), 0);
      const mfVal = clientAssets.filter(a => a.type === "mf").reduce((s, a) => s + (a.value ?? 0), 0);
      const reVal = clientAssets.filter(a => a.type === "property").reduce((s, a) => s + (a.value ?? 0), 0);
      const total = totalVal || 1;
      const equityPct = parseFloat(((stockVal / total) * 100).toFixed(1));
      const mfPct = parseFloat(((mfVal / total) * 100).toFixed(1));
      const realEstatePct = parseFloat(((reVal / total) * 100).toFixed(1));
      const riskLevel: RiskLevel = equityPct > 65 ? "High" : equityPct > 40 ? "Medium" : "Low";
      const suggestedAction: SuggestedAction = equityPct > 65 ? "Rebalance" : (mfPct < 15 && realEstatePct < 10) ? "Diversify" : "Hold";
      return {
        clientId: client.id,
        name: client.name,
        email: client.email,
        isActive: client.isActive ?? true,
        portfolioValue: totalVal,
        returnPercent: returnPct,
        riskLevel,
        equityPct,
        mfPct,
        realEstatePct,
        suggestedAction,
      };
    });
  }, [clients, groupedAssets]);

  const alerts = useMemo(() => deriveAlerts(intelligenceRows), [intelligenceRows]);
  const avgReturn = useMemo(() => calcAverageReturn(intelligenceRows), [intelligenceRows]);

  async function refreshSelectedClientAssets(clientId: number) {
    try {
      const refreshed = await fetchAssets(clientId);
      setGroupedAssets((prev) => ({
        ...prev,
        [String(clientId)]: refreshed,
      }));
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      showToast(message, "error");
      throw err;
    }
  }

  async function handleAdd(payload: CreateAssetPayload) {
    if (!selectedClient) return;
    try {
      await createAsset({ ...payload, userId: selectedClient.id });
      await refreshSelectedClientAssets(selectedClient.id);
      showToast("Asset added successfully.", "success");
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      showToast(message, "error");
    }
  }

  async function handleEdit(id: number, payload: UpdateAssetPayload) {
    if (!selectedClient) return;
    try {
      await updateAsset(id, payload);
      await refreshSelectedClientAssets(selectedClient.id);
      showToast("Asset updated successfully.", "success");
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      showToast(message, "error");
    }
  }

  async function handleDelete(id: number) {
    if (!selectedClient) return;
    try {
      await deleteAsset(id);
      await refreshSelectedClientAssets(selectedClient.id);
      showToast("Asset deleted successfully.", "success");
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      showToast(message, "error");
    }
  }

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 text-white">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-gray-400 mt-1">
          Actionable insights across all client portfolios.
        </p>
      </div>

      {/* Section 1: Alerts */}
      <AlertsPanel alerts={alerts} />

      {/* Section 2: KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatBox
          label="Total AUM"
          value={fmtCurrency(totalAUM)}
          subValue="Assets Under Management"
          trend="up"
          trendLabel="All clients"
        />
        <StatBox
          label="Active Clients"
          value={activeClients}
          subValue={`of ${clients.length} total`}
        />
        <StatBox
          label="Holdings"
          value={allAssets.length}
          subValue="Across all clients"
        />
        <StatBox
          label="Avg Return"
          value={`${avgReturn >= 0 ? "+" : ""}${avgReturn}%`}
          subValue="Portfolio average"
          trend={avgReturn >= 0 ? "up" : "down"}
          trendLabel={avgReturn >= 0 ? "Positive" : "Negative"}
        />
      </div>

      {/* Section 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PortfolioGrowthChart totalValue={totalAUM} gainPercent={avgReturn} />
        </div>
        <div>
          <AllocationChart allocation={allocation} />
        </div>
      </div>

      {/* Section 4: Insights Panel */}
      {intelligenceRows.length > 0 && (
        <RecommendationCard rows={intelligenceRows.slice(0, 5)} />
      )}

      {/* Section 5: Quick Actions */}
      <div
        className="glass-card rounded-2xl p-5"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#C9A227" }}>
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              href: "/admin/clients/new",
              label: "Add Client",
              color: "#C9A227",
              bg: "rgba(201,162,39,0.08)",
              border: "rgba(201,162,39,0.2)",
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
              ),
            },
            {
              href: "/admin/assets",
              label: "Add Asset",
              color: "#00E5FF",
              bg: "rgba(0,229,255,0.06)",
              border: "rgba(0,229,255,0.15)",
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              ),
            },
            {
              href: "/admin/insights",
              label: "View Insights",
              color: "#00ff9f",
              bg: "rgba(0,255,159,0.06)",
              border: "rgba(0,255,159,0.15)",
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
            },
            {
              href: "/admin/portfolio",
              label: "Portfolios",
              color: "#a78bfa",
              bg: "rgba(167,139,250,0.06)",
              border: "rgba(167,139,250,0.15)",
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-8 4 4 4-6 4 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
                </svg>
              ),
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all hover:scale-105"
              style={{
                background: action.bg,
                border: `1px solid ${action.border}`,
              }}
            >
              <span style={{ color: action.color }}>{action.icon}</span>
              <span className="text-xs font-semibold text-white">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Section 6: Client Portfolio (kept at bottom) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#c9a227" }}>
            Client Portfolio
          </h2>
          <Link href="/admin/portfolio" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Full portfolio manager →
          </Link>
        </div>

        <div
          className="glass-card rounded-2xl p-5 mb-4"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
            Select Client
          </p>
          <ClientSelector
            selectedId={selectedClient?.id ?? null}
            onChange={(client) => {
              setSelectedClient(client);
              setActiveTab("stocks");
            }}
          />
        </div>

        {!selectedClient && (
          <div
            className="glass-card rounded-2xl p-10 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-gray-400 text-sm">
              Select a client above to view their holdings.
            </p>
          </div>
        )}

        {selectedClient && assets.length === 0 && (
          <div
            className="glass-card rounded-2xl p-10 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-gray-400 text-sm">
              No assets found for{" "}
              <span className="text-white font-medium">{selectedClient.name}</span>.
            </p>
          </div>
        )}

        {selectedClient && assets.length > 0 && (
          <AssetTabs
            assets={assets}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </section>
    </div>
  );
}
