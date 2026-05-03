"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminClients } from "@/lib/services/clientService";
import {
  fetchAdminGroupedAssets,
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
import StatBox from "@/components/ui/StatBox";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import PortfolioGrowthChart from "@/components/dashboard/PortfolioGrowthChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import ClientSelector from "@/components/ClientSelector";
import AssetTabs from "@/components/dashboard/AssetTabs";

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
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  // Single source of truth: all client assets keyed by string user_id
  const [groupedAssets, setGroupedAssets] = useState<Record<string, Asset[]>>({});
  const [activeTab, setActiveTab] = useState<Tab>("stocks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    // Sequential fetch: load client list first, then fetch each client's assets
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

  // All assets flattened for aggregate stats
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
    const pct = (type: Asset["type"]) => {
      const val = allAssets
        .filter((a: Asset) => a.type === type)
        .reduce((s: number, a: Asset) => s + (a.value ?? 0), 0);
      return parseFloat(((val / totalAUM) * 100).toFixed(1));
    };
    return {
      stock: pct("stock"),
      mf: pct("mf"),
      realEstate: pct("property"),
    };
  }, [allAssets, totalAUM]);

  const activeClients = clients.filter((c: AdminClient) => c.isActive).length;
  // Derive selected client's assets from the grouped map — no separate fetch
  const assets: Asset[] = groupedAssets[String(selectedClient?.id ?? "")] ?? [];

  async function handleAdd(payload: CreateAssetPayload) {
    if (!selectedClient) return;
    try {
      const newAsset = await createAsset({ ...payload, userId: selectedClient.id });
      setGroupedAssets((prev) => ({
        ...prev,
        [String(selectedClient.id)]: [...(prev[String(selectedClient.id)] ?? []), newAsset],
      }));
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleEdit(id: number, payload: UpdateAssetPayload) {
    if (!selectedClient) return;
    try {
      const updatedAsset = await updateAsset(id, payload);
      setGroupedAssets((prev) => ({
        ...prev,
        [String(selectedClient.id)]: (prev[String(selectedClient.id)] ?? []).map((a) =>
          a.id === id ? updatedAsset : a
        ),
      }));
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    if (!selectedClient) return;
    try {
      await deleteAsset(id);
      setGroupedAssets((prev) => ({
        ...prev,
        [String(selectedClient.id)]: (prev[String(selectedClient.id)] ?? []).filter((a) => a.id !== id),
      }));
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8 text-white">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#c9a227]">Financial Intelligence</h1>
        <p className="text-sm text-gray-400 mt-1">
          Actionable insights across all client portfolios.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatBox
          label="Total AUM"
          value={fmtCurrency(totalAUM)}
          subValue="Assets Under Management"
          trend="up"
          trendLabel="All clients"
        />
        <StatBox
          label="Total Clients"
          value={clients.length}
          subValue={`${activeClients} active`}
        />
        <StatBox
          label="Total Holdings"
          value={allAssets.length}
          subValue="Across all clients"
        />
      </div>

      {/* PORTFOLIO OVERVIEW */}
      <section>
        <SectionHeading title="Portfolio Overview" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PortfolioGrowthChart totalValue={totalAUM} gainPercent={0} />
          </div>
          <div>
            <AllocationChart allocation={allocation} />
          </div>
        </div>
      </section>

      {/* CLIENT PORTFOLIO SECTION */}
      <section>
        <SectionHeading
          title="Client Portfolio"
          link="/admin/portfolio"
          linkLabel="Full portfolio manager →"
        />

        {/* Client selector */}
        <div className="glass-card rounded-2xl p-5 mb-4">
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

        {/* Holdings */}
        {!selectedClient && (
          <div
            className="glass-card rounded-2xl p-10 text-center"
            style={{ border: "1px solid rgba(201,162,39,0.15)" }}
          >
            <p className="text-gray-400 text-sm">
              Select a client above to view their holdings.
            </p>
          </div>
        )}

        {selectedClient && assets.length === 0 && (
          <div
            className="glass-card rounded-2xl p-10 text-center"
            style={{ border: "1px solid rgba(201,162,39,0.15)" }}
          >
            <p className="text-gray-400 text-sm">
              No assets found for <span className="text-white font-medium">{selectedClient.name}</span>.
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

function SectionHeading({
  title,
  link,
  linkLabel,
}: {
  title: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[#c9a227]">
        {title}
      </h2>
      {link && (
        <a href={link} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          {linkLabel ?? "View all →"}
        </a>
      )}
    </div>
  );
}
