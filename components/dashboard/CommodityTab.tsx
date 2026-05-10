"use client";

import { useState } from "react";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";
import EmptyState from "@/components/ui/EmptyState";
import CommodityModal from "./modals/CommodityModal";

interface CommodityTabProps {
  assets: Asset[];
  onAdd: (payload: CreateAssetPayload) => Promise<void>;
  onEdit: (id: number, payload: UpdateAssetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function isCommodityAsset(asset: Asset): boolean {
  return asset.type === "commodity" || (asset.tags ?? []).some((tag) => tag.toLowerCase() === "commodity");
}

function fmt(value: number | undefined | null, prefix = "₹") {
  if (value == null || !Number.isFinite(value)) return `${prefix}0`;
  return `${prefix}${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}`;
}

export default function CommodityTab({ assets, onAdd, onEdit, onDelete }: CommodityTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const commodities = assets.filter(isCommodityAsset);

  async function handleSave(payload: CreateAssetPayload | UpdateAssetPayload) {
    if (editing) {
      await onEdit(editing.id, payload as UpdateAssetPayload);
    } else {
      await onAdd(payload as CreateAssetPayload);
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {commodities.length} holding{commodities.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl modal-btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Commodity
        </button>
      </div>

      {commodities.length === 0 ? (
        <EmptyState
          title="No commodities yet"
          description='Click "+ Add Commodity" to track commodity holdings.'
          action={
            <button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 text-sm font-semibold rounded-xl modal-btn-primary"
            >
              + Add Commodity
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto glass-card rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Symbol", "Commodity", "Exchange", "Quantity", "Avg Price", "Current Price", "Value", "Tags", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{
                        borderBottom: "1px solid rgba(201,162,39,0.15)",
                        color: "#c9a227",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {commodities.map((asset) => {
                const isDeleting = deletingId === asset.id;
                return (
                  <tr
                    key={asset.id}
                    style={{ borderBottom: "1px solid rgba(201,162,39,0.07)" }}
                    className="transition-colors hover:bg-[rgba(201,162,39,0.04)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-white">
                      {asset.symbol ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">{asset.name}</td>
                    <td className="px-4 py-3 text-gray-300">{asset.exchange ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-300">{asset.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(asset.avgPrice)}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(asset.currentPrice ?? 0)}</td>
                    <td className="px-4 py-3 text-white font-medium">{fmt(asset.value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(asset.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(201,162,39,0.12)",
                              color: "#d4af4a",
                              border: "1px solid rgba(201,162,39,0.2)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditing(asset);
                            setModalOpen(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg transition-colors modal-btn-secondary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          disabled={isDeleting}
                          className="text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.15)",
                          }}
                        >
                          {isDeleting ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <CommodityModal
          asset={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
