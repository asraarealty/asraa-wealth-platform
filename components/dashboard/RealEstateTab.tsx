"use client";

import { useState } from "react";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";
import EmptyState from "@/components/ui/EmptyState";
import RealEstateModal from "./modals/RealEstateModal";

interface RealEstateTabProps {
  assets: Asset[];
  onAdd: (payload: CreateAssetPayload) => Promise<void>;
  onEdit: (id: number, payload: UpdateAssetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function fmt(n: number | undefined | null) {
  if (n == null) return "—";
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

function getRentStatus(
  dueDate: string | undefined | null
): { label: string; color: string; bg: string } {
  if (!dueDate)
    return {
      label: "No tenant",
      color: "rgba(255,255,255,0.4)",
      bg: "rgba(255,255,255,0.05)",
    };

  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (due < now)
    // Due date is in the past (strictly before today) → rent is late
    return {
      label: "Late",
      color: "#f87171",
      bg: "rgba(239,68,68,0.1)",
    };

  return {
    label: "Paid",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.1)",
  };
}

function getYield(rentAmount: number | undefined | null, currentValue: number | undefined | null) {
  if (!rentAmount || !currentValue || currentValue === 0) return null;
  return ((rentAmount * 12) / currentValue) * 100;
}

export default function RealEstateTab({
  assets,
  onAdd,
  onEdit,
  onDelete,
}: RealEstateTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const properties = assets.filter((a) => a.type === "real_estate");

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
          {properties.length} propert{properties.length !== 1 ? "ies" : "y"}
        </p>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
          style={{ background: "#c9a227", color: "#071a14" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description={`Click "+ Add Property" to track your real estate investments.`}
          action={
            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="px-4 py-2 text-sm font-semibold rounded-xl"
              style={{ background: "#c9a227", color: "#071a14" }}
            >
              + Add Property
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((a) => {
            const rentStatus = getRentStatus(a.rent_due_date);
            const yieldPct = getYield(a.rent_amount, a.current_value);
            const appreciation =
              a.current_value != null && a.purchase_price != null && a.purchase_price > 0
                ? ((a.current_value - a.purchase_price) / a.purchase_price) * 100
                : null;
            const isDeleting = deletingId === a.id;

            return (
              <div
                key={a.id}
                className="glass-card card-hover rounded-2xl p-5 flex flex-col gap-4"
              >
                {/* Title + actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">
                      {a.name}
                    </h3>
                    {a.location && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                        📍 {a.location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
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
                </div>

                {/* Financials */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-xs text-gray-500 mb-1">Current Value</p>
                    <p className="text-base font-bold text-white">{fmt(a.current_value)}</p>
                    {appreciation != null && (
                      <p
                        className="text-xs font-medium mt-0.5"
                        style={{ color: appreciation >= 0 ? "#4ade80" : "#f87171" }}
                      >
                        {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}% gain
                      </p>
                    )}
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
                    <p className="text-base font-bold text-white">
                      {a.rent_amount ? fmt(a.rent_amount) : "—"}
                    </p>
                    {yieldPct != null && (
                      <p className="text-xs font-medium mt-0.5" style={{ color: "#d4af4a" }}>
                        {yieldPct.toFixed(2)}% yield
                      </p>
                    )}
                  </div>
                </div>

                {/* Rent status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Rent Status</span>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: rentStatus.bg,
                      color: rentStatus.color,
                    }}
                  >
                    {rentStatus.label}
                  </span>
                </div>

                {/* Tenant info */}
                {a.tenant_name && (
                  <div
                    className="rounded-xl p-3 space-y-1"
                    style={{
                      background: "rgba(201,162,39,0.05)",
                      border: "1px solid rgba(201,162,39,0.1)",
                    }}
                  >
                    <p className="text-xs font-semibold" style={{ color: "#d4af4a" }}>
                      Tenant
                    </p>
                    <p className="text-sm text-white">{a.tenant_name}</p>
                    {a.tenant_phone && (
                      <p className="text-xs text-gray-400">{a.tenant_phone}</p>
                    )}
                    {a.tenant_email && (
                      <p className="text-xs text-gray-400 truncate">{a.tenant_email}</p>
                    )}
                  </div>
                )}

                {/* Tags */}
                {(a.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(a.tags ?? []).map((tag) => (
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <RealEstateModal
          asset={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
