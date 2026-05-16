"use client";

import { useState } from "react";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";
import EmptyState from "@/components/ui/EmptyState";
import StockModal from "./modals/StockModal";

interface StocksTabProps {
  assets: Asset[];
  onAdd: (payload: CreateAssetPayload) => Promise<void>;
  onEdit: (id: number, payload: UpdateAssetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function fmt(n: number | undefined | null, prefix = "₹") {
  if (n == null) return "—";
  return `${prefix}${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

export default function StocksTab({
  assets,
  onAdd,
  onEdit,
  onDelete,
}: StocksTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const safeAssets = Array.isArray(assets) ? assets : [];
  const stocks = safeAssets.filter((a) => a?.type === "stock");

  async function handleSave(
    payload: CreateAssetPayload | UpdateAssetPayload
  ) {
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
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {stocks.length} holding{stocks.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
          style={{ background: "#c9a227", color: "#071a14" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Stock
        </button>
      </div>

      {stocks.length === 0 ? (
        <EmptyState
          title="No stocks yet"
          description={`Click "+ Add Stock" to track your equity holdings.`}
          action={
            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="px-4 py-2 text-sm font-semibold rounded-xl"
              style={{ background: "#c9a227", color: "#071a14" }}
            >
              + Add Stock
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto glass-card rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Symbol", "Name", "Qty", "Avg Price", "Value", "Tags", ""].map(
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
              {stocks.map((a) => {
                const isDeleting = deletingId === a.id;

                return (
                  <tr
                    key={a.id}
                    style={{ borderBottom: "1px solid rgba(201,162,39,0.07)" }}
                    className="transition-colors"
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "rgba(201,162,39,0.04)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "")
                    }
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-white">
                      {a.symbol ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-200 max-w-[160px] truncate">
                      {a.name || "Unnamed stock"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{a.quantity ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(a.avg_price)}</td>
                    <td className="px-4 py-3 text-white font-medium">{fmt(a.value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(a.tags) ? a.tags : []).map((tag) => (
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
                          onClick={() => { setEditing(a); setModalOpen(true); }}
                          className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                          style={{
                            background: "rgba(201,162,39,0.1)",
                            color: "#d4af4a",
                            border: "1px solid rgba(201,162,39,0.2)",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
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
        <StockModal
          asset={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
