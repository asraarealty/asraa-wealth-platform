"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  type Asset,
  type AssetsResponse,
  type CreateAssetPayload,
  type UpdateAssetPayload,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import type { Client } from "@/lib/api";
import ClientSelector from "@/components/ClientSelector";
import AssetTabs from "@/components/dashboard/AssetTabs";
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

export default function AdminPortfolioPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stocks");

  const loadData = useCallback(async (clientId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAssets(clientId);
      setData(res);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setData(null);
      return;
    }
    loadData(selectedClient.id);
  }, [selectedClient, loadData]);

  const assets: Asset[] = data?.assets ?? [];
  const summary = data?.summary;

  async function handleAdd(payload: CreateAssetPayload) {
    if (!selectedClient) return;
    try {
      await createAsset({ ...payload, user_id: selectedClient.id });
      loadData(selectedClient.id);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleEdit(id: number, payload: UpdateAssetPayload) {
    try {
      await updateAsset(id, payload);
      if (selectedClient) loadData(selectedClient.id);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteAsset(id);
      if (selectedClient) loadData(selectedClient.id);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  const returnPct = summary?.return_percentage ?? 0;

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
      {selectedClient && !loading && !error && data !== null && (
        <>
          {/* Client info banner */}
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-xl"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(201,162,39,0.2)", color: "#c9a227" }}
            >
              {selectedClient.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selectedClient.name}</p>
              <p className="text-xs text-gray-400 truncate">{selectedClient.email}</p>
            </div>
            <span
              className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
              style={
                selectedClient.is_active
                  ? { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {selectedClient.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              label="Total Value"
              value={fmtCurrency(summary?.total_value ?? 0)}
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
              value={fmtCurrency(summary?.total_invested ?? 0)}
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
              value={fmtCurrency(summary?.total_return ?? 0)}
              trend={(summary?.total_return ?? 0) >= 0 ? "up" : "down"}
              trendLabel={(summary?.total_return ?? 0) >= 0 ? "Gain" : "Loss"}
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
    </div>
  );
}

