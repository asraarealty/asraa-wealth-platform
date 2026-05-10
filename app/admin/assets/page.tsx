"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createAsset,
  updateAsset,
  deleteAsset,
  type CreateAssetPayload,
  type UpdateAssetPayload,
  type Client,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { usePortfolioState } from "@/lib/hooks/usePortfolioState";
import ClientSelector from "@/components/ClientSelector";
import AssetTabs from "@/components/dashboard/AssetTabs";
import ErrorState from "@/components/ui/ErrorState";
import PortfolioSkeleton from "@/components/ui/PortfolioSkeleton";
import { useToast } from "@/context/ToastContext";

type Tab = "stocks" | "mutual_funds" | "real_estate";

export default function AssetsPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const urlClientId = searchParams.get("clientId");
  const autoSelectId = urlClientId ? Number(urlClientId) : null;

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stocks");

  const {
    assets,
    loading,
    error,
    retry,
    runMutation,
  } = usePortfolioState({
    clientId: selectedClient?.id,
    enabled: Boolean(selectedClient),
  });

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

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Assets</h1>
        <p className="text-sm text-gray-400 mt-1">
          Select a client to view and manage their investment holdings.
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
          }}
        />
      </div>

      {/* No client selected */}
      {!selectedClient && (
        <div
          className="glass-card rounded-2xl p-12 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.12)" }}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#00E5FF" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          </div>
          <p className="text-white font-medium text-base">Select a client to view assets</p>
          <p className="text-sm text-gray-500 mt-1.5">
            Choose a client above to browse and manage their stocks, mutual funds, and real estate.
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

      {/* Asset Tabs */}
      {selectedClient && !loading && !error && (
        <AssetTabs
          assets={assets}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
