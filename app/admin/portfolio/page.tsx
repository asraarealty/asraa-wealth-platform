"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  createAsset,
  updateAsset,
  deleteAsset,
  type CreateAssetPayload,
  type UpdateAssetPayload,
} from "@/lib/api";
import { fmtCurrency } from "@/lib/formatters";
import type { Client } from "@/lib/api";
import ClientSelector from "@/components/ClientSelector";
import AssetTabs from "@/components/dashboard/AssetTabs";
import AddAssetModal from "@/components/dashboard/modals/AddAssetModal";
import StatBox from "@/components/ui/StatBox";
import ErrorState from "@/components/ui/ErrorState";
import PortfolioGrowthChart from "@/components/dashboard/PortfolioGrowthChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import { usePortfolioState } from "@/lib/hooks/usePortfolioState";
import PortfolioSkeleton from "@/components/ui/PortfolioSkeleton";
import { useToast } from "@/context/ToastContext";
import { deriveAllocationFromValues } from "@/lib/utils/portfolioMath";

type Tab = "stocks" | "mutual_funds" | "real_estate";
type PortfolioTab = "overview" | "holdings" | "performance" | "risk" | "transactions";

function whatsAppLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

const PORTFOLIO_TABS: { id: PortfolioTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "holdings", label: "Holdings" },
  { id: "performance", label: "Performance" },
  { id: "risk", label: "Risk & Insights" },
  { id: "transactions", label: "Transactions" },
];

export default function AdminPortfolioPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const urlClientId = searchParams.get("clientId");
  const autoSelectId = urlClientId ? Number(urlClientId) : null;

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stocks");
  const [portfolioTab, setPortfolioTab] = useState<PortfolioTab>("overview");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const {
    portfolio,
    assets,
    loading,
    error,
    retry,
    runMutation,
  } = usePortfolioState({
    clientId: selectedClient?.id,
    enabled: Boolean(selectedClient),
  });

  const totalValue = portfolio?.totalValue ?? 0;
  const totalInvested = useMemo(
    () => assets.reduce((s, a) => s + ((a.quantity ?? 0) * (a.avgPrice ?? 0)), 0),
    [assets]
  );
  const totalReturn = totalValue - totalInvested;
  const returnPct = portfolio?.roiPercent ?? (totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0);

  const assetsAllocation = useMemo(
    () => deriveAllocationFromValues({
      stockValue: portfolio?.stockValue,
      mfValue: portfolio?.mfValue,
      propertyValue: portfolio?.propertyValue,
      totalValue: portfolio?.totalValue,
    }),
    [portfolio]
  );

  async function handleAdd(payload: CreateAssetPayload) {
    if (!selectedClient) return;
    try {
      await runMutation(() => createAsset({ ...payload, userId: selectedClient.id }));
      showToast("Asset added successfully.", "success");
    } catch (err) {
      showToast(toErrorMessage(err), "error");
    }
  }

  async function handleEdit(id: number, payload: UpdateAssetPayload) {
    if (!selectedClient) return;
    try {
      await runMutation(() => updateAsset(id, payload));
      showToast("Asset updated successfully.", "success");
    } catch (err) {
      showToast(toErrorMessage(err), "error");
    }
  }

  async function handleDelete(id: number) {
    if (!selectedClient) return;
    try {
      await runMutation(() => deleteAsset(id));
      showToast("Asset deleted successfully.", "success");
    } catch (err) {
      showToast(toErrorMessage(err), "error");
    }
  }

  const riskLevel = useMemo(() => {
    if (!assetsAllocation) return "Low";
    if (assetsAllocation.stock > 65) return "High";
    if (assetsAllocation.stock > 40) return "Medium";
    return "Low";
  }, [assetsAllocation]);

  const riskColor = riskLevel === "High" ? "#ef4444" : riskLevel === "Medium" ? "#f59e0b" : "#10b981";
  const riskBg = riskLevel === "High" ? "rgba(239,68,68,0.1)" : riskLevel === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)";

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolios</h1>
        <p className="text-sm text-gray-400 mt-1">
          Select a client to view and manage their investment portfolio.
        </p>
      </div>

      {/* Client Selector */}
      <div
        className="glass-card rounded-2xl p-5"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
          Select Client
        </p>
        <ClientSelector
          selectedId={selectedClient?.id ?? null}
          autoSelectId={autoSelectId}
          onChange={(client) => {
            setSelectedClient(client);
            setActiveTab("stocks");
            setPortfolioTab("overview");
          }}
        />
      </div>

      {/* No client selected */}
      {!selectedClient && (
        <div
          className="glass-card rounded-2xl p-10 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#00E5FF" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <p className="text-white font-medium">Select a client to view portfolio</p>
          <p className="text-sm text-gray-500 mt-1">
            Choose a client from the list above to view and manage their assets.
          </p>
        </div>
      )}

      {/* Loading / Error */}
      {selectedClient && loading && <PortfolioSkeleton />}
      {selectedClient && !loading && error && (
        <div className="space-y-3">
          <ErrorState message={error} />
          <button
            onClick={() => void retry()}
            className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-black"
            style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Portfolio content */}
      {selectedClient && !loading && !error && (
        <>
          {/* Client header banner */}
          <div
            className="flex flex-wrap items-center gap-3 px-5 py-4 rounded-xl"
            style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.12)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}
            >
              {selectedClient.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{selectedClient.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                <p className="text-xs text-gray-400 truncate">{selectedClient.email}</p>
                {selectedClient.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    {selectedClient.phone}
                    <a
                      href={whatsAppLink(selectedClient.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium text-xs"
                      style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                      </svg>
                      WhatsApp
                    </a>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={
                  selectedClient.isActive
                    ? { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }
                    : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                {selectedClient.isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style={{ background: "#c9a227", color: "#071a14" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Asset
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            className="flex items-center gap-1 overflow-x-auto pb-1"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {PORTFOLIO_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPortfolioTab(tab.id)}
                className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all relative"
                style={
                  portfolioTab === tab.id
                    ? { color: "#00E5FF" }
                    : { color: "rgba(156,163,175,0.7)" }
                }
              >
                {tab.label}
                {portfolioTab === tab.id && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "#00E5FF" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {portfolioTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox
                  label="Total Value"
                  value={fmtCurrency(totalValue)}
                  trend={returnPct >= 0 ? "up" : "down"}
                  trendLabel={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`}
                  subValue="current portfolio value"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                  }
                />
                <StatBox
                  label="Invested"
                  value={fmtCurrency(totalInvested)}
                  trend="neutral"
                  subValue="total cost basis"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                  }
                />
                <StatBox
                  label="Returns %"
                  value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
                  trend={returnPct >= 0 ? "up" : "down"}
                  trendLabel={returnPct >= 0 ? "Profit" : "Loss"}
                  subValue="all time"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
                    </svg>
                  }
                />
                <StatBox
                  label="Total Profit"
                  value={fmtCurrency(totalReturn)}
                  trend={totalReturn >= 0 ? "up" : "down"}
                  trendLabel={totalReturn >= 0 ? "Gain" : "Loss"}
                  subValue="absolute return"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  }
                />
              </div>
              <AllocationChart allocation={assetsAllocation} />
            </div>
          )}

          {portfolioTab === "holdings" && (
            <AssetTabs
              assets={assets}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {portfolioTab === "performance" && (
            <PortfolioGrowthChart totalValue={totalValue} gainPercent={returnPct} />
          )}

          {portfolioTab === "risk" && (
            <div
              className="glass-card rounded-2xl p-6 space-y-5"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold"
                  style={{ background: riskBg, color: riskColor, border: `1px solid ${riskColor}33` }}
                >
                  {riskLevel} Risk
                </span>
                <p className="text-gray-400 text-sm">
                  {riskLevel === "High"
                    ? "Portfolio is heavily equity-weighted. Consider rebalancing."
                    : riskLevel === "Medium"
                    ? "Moderate risk profile with balanced allocation."
                    : "Conservative portfolio with low equity exposure."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Equity %", value: `${assetsAllocation?.stock ?? 0}%`, color: "#C9A227" },
                  { label: "Mutual Funds %", value: `${assetsAllocation?.mf ?? 0}%`, color: "#10b981" },
                  { label: "Real Estate %", value: `${assetsAllocation?.realEstate ?? 0}%`, color: "#3b82f6" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-4 text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
              {assetsAllocation && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Suggestions</p>
                  {(assetsAllocation.stock ?? 0) > 60 && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      Reduce equity exposure — consider shifting to debt or real estate
                    </div>
                  )}
                  {(assetsAllocation.mf ?? 0) < 20 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Increase mutual fund allocation for diversification
                    </div>
                  )}
                  {(assetsAllocation.realEstate ?? 0) < 10 && (
                    <div className="flex items-center gap-2 text-sm text-sky-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                      Consider adding real estate exposure
                    </div>
                  )}
                  {(assetsAllocation.stock ?? 0) <= 60 && (assetsAllocation.mf ?? 0) >= 20 && (assetsAllocation.realEstate ?? 0) >= 10 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                      Portfolio is well balanced — maintain current allocation
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {portfolioTab === "transactions" && (
            <div
              className="glass-card rounded-2xl p-10 text-center"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <p className="text-white font-medium">Transactions coming soon</p>
              <p className="text-sm text-gray-500 mt-1">
                Transaction history will be available in a future update.
              </p>
            </div>
          )}
        </>
      )}

      {/* Add Asset modal */}
      {addModalOpen && selectedClient && (
        <AddAssetModal
          onClose={() => setAddModalOpen(false)}
          onSave={async (payload) => {
            await handleAdd(payload);
            setAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
