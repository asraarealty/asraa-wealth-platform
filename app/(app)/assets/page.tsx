"use client";
import { useState } from "react";
import { useAssets, useDeleteAsset } from "@/lib/hooks/useAssets";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { Asset, AssetType } from "@/lib/types/assets";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const TYPE_COLORS: Record<string, string> = { stock: "#38bdf8", mf: "#34d399", property: "#a78bfa" };
const TABS: { key: AssetType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stock", label: "Stocks" },
  { key: "mf", label: "Mutual Funds" },
  { key: "property", label: "Property" },
];

function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: (id: number) => void }) {
  const positive = asset.return_percentage >= 0;
  const color = TYPE_COLORS[asset.type] ?? "#38bdf8";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: `${color}22`, color }}
        >
          {asset.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{asset.name}</p>
          <p className="text-xs text-gray-500 capitalize">{asset.symbol ?? asset.type}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-white text-sm">{fmt(asset.value)}</p>
          <p className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {asset.return_percentage >= 0 ? "+" : ""}{asset.return_percentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
        {asset.type === "stock" && (
          <>
            <span>Qty: <span className="text-white">{asset.quantity ?? "—"}</span></span>
            <span>Avg: <span className="text-white">{asset.avg_price ? fmt(asset.avg_price) : "—"}</span></span>
            <span>CMP: <span className="text-white">{asset.current_price ? fmt(asset.current_price) : "—"}</span></span>
          </>
        )}
        {asset.type === "mf" && (
          <>
            <span>Units: <span className="text-white">{asset.units ?? "—"}</span></span>
            <span>NAV: <span className="text-white">{asset.nav ? fmt(asset.nav) : "—"}</span></span>
          </>
        )}
        {asset.type === "property" && (
          <>
            <span className="col-span-2">📍 <span className="text-white">{asset.location ?? "—"}</span></span>
            {asset.tenant_name && <span className="col-span-2">👤 <span className="text-white">{asset.tenant_name}</span></span>}
          </>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <Link
          href={`/assets/${asset.id}/edit`}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-sky-400 border border-sky-500/20 hover:bg-sky-500/10 transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => { if (confirm("Delete this asset?")) onDelete(asset.id); }}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
        >
          Delete
        </button>
      </div>
    </motion.div>
  );
}

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<AssetType | "all">("all");
  const { data, isLoading } = useAssets();
  const deleteAsset = useDeleteAsset();

  const assets = data?.assets ?? [];
  const filtered = activeTab === "all" ? assets : assets.filter((a: Asset) => a.type === activeTab);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white">Assets</h1>
        <Link
          href="/assets/new"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-sky-400 border border-sky-500/20 hover:bg-sky-500/10 transition-colors"
        >
          + Add
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : "text-gray-500 border border-white/5 hover:text-gray-300"
            }`}
          >
            {tab.label} {tab.key !== "all" && `(${assets.filter((a: Asset) => a.type === tab.key).length})`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Assets */}
      {!isLoading && (
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-gray-500 text-sm"
            >
              No {activeTab === "all" ? "assets" : activeTab === "mf" ? "mutual funds" : activeTab} yet.
              <br />
              <Link href="/assets/new" className="text-sky-400 font-semibold mt-2 inline-block">Add one now →</Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.map((asset: Asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onDelete={(id) => deleteAsset.mutate(id)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
