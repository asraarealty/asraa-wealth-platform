"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  type Asset,
  type CreateAssetPayload,
  type UpdateAssetPayload,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import type { Client } from "@/lib/api";
import ClientSelector from "@/components/ClientSelector";
import AssetTabs from "@/components/dashboard/AssetTabs";
import AddAssetModal from "@/components/dashboard/modals/AddAssetModal";
import StatBox from "@/components/ui/StatBox";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

type Tab = "stocks" | "mutual_funds" | "real_estate";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Strip non-digit characters and produce a wa.me link */
function whatsAppLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // Assume Indian numbers: prepend 91 if exactly 10 digits
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export default function AdminPortfolioPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stocks");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const loadData = useCallback(
    async (clientId: number, silent = false) => {
      if (!silent) {
        setLoading(true);
        setAssets([]); // clear stale data before loading the new client
      }
      setError(null);
      try {
        const data = await fetchAssets(clientId);
        setAssets(data);
      } catch (err) {
        if (!silent) setError(toErrorMessage(err));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!selectedClient) {
      setAssets([]);
      return;
    }
    const id = selectedClient.id;
    loadData(id);

    function doRefresh() {
      if (document.visibilityState === "hidden") return;
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      void loadData(id, true).catch(() => {}).finally(() => {
        refreshingRef.current = false;
      });
    }

    const interval = setInterval(doRefresh, 20_000);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") doRefresh();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [selectedClient, loadData]);

  const totalValue = useMemo(() => assets.reduce((s: number, a: Asset) => s + (a.value ?? 0), 0), [assets]);
  const totalInvested = useMemo(() => assets.reduce((s: number, a: Asset) => s + ((a.quantity ?? 0) * (a.avgPrice ?? 0)), 0), [assets]);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  async function handleAdd(payload: CreateAssetPayload) {
    if (!selectedClient) return;
    try {
      const newAsset = await createAsset({ ...payload, user_id: selectedClient.id });
      setAssets((prev) => [...prev, newAsset]);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleEdit(id: number, payload: UpdateAssetPayload) {
    if (!selectedClient) return;
    try {
      const updatedAsset = await updateAsset(id, payload);
      setAssets((prev) => prev.map((a) => (a.id === id ? updatedAsset : a)));
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    if (!selectedClient) return;
    try {
      await deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#c9a227" }}>
          Client Portfolio
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Select a client to view and manage their investment portfolio.
        </p>
      </div>

      {/* Client Selector */}
      <div className="glass-card rounded-2xl p-5">
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

      {/* No client selected */}
      {!selectedClient && (
        <div
          className="glass-card rounded-2xl p-10 text-center"
          style={{ border: "1px solid rgba(201,162,39,0.15)" }}
        >
          <div
            className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.2)" }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#c9a227" strokeWidth={1.8}>
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
      {selectedClient && loading && <Loader />}
      {selectedClient && !loading && error && <ErrorState message={error} />}

      {/* Portfolio content */}
      {selectedClient && !loading && !error && (
        <>
          {/* ── Client header ── */}
          <div
            className="flex flex-wrap items-center gap-3 px-5 py-4 rounded-xl"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)" }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "rgba(201,162,39,0.2)", color: "#c9a227" }}
            >
              {selectedClient.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
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
                      {/* WhatsApp icon */}
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                      </svg>
                      WhatsApp
                    </a>
                  </span>
                )}
              </div>
            </div>

            {/* Status + Add Asset */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={
                  selectedClient.is_active
                    ? { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }
                    : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                {selectedClient.is_active ? "Active" : "Inactive"}
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

          {/* KPI Row */}
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

          {/* Empty portfolio */}
          {assets.length === 0 && (
            <div
              className="glass-card rounded-2xl p-10 text-center"
              style={{ border: "1px solid rgba(201,162,39,0.15)" }}
            >
              <p className="text-gray-400 text-sm">
                No assets found for {selectedClient.name}. Add their first investment below.
              </p>
            </div>
          )}

          {/* Asset Tabs — show even when empty so admin can add */}
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

      {/* Unified Add Asset modal */}
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


