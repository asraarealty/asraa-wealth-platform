"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import type {
  Asset,
  AssetsAllocation,
  CreateAssetPayload,
  UpdateAssetPayload,
  InsightsResponse,
} from "@/lib/api";
import AddAssetModal from "./modals/AddAssetModal";
import StockModal from "./modals/StockModal";
import MFModal from "./modals/MFModal";
import RealEstateModal from "./modals/RealEstateModal";
import ClientSelector from "../ClientSelector";
import AllocationChart from "./AllocationChart";
import AIInsightsPanel from "./AIInsightsPanel";
import ErrorState from "../ui/ErrorState";

/* ── types ──────────────────────────────────────────────────────────── */

type MobileTab = "dashboard" | "stocks" | "mutual_funds" | "real_estate" | "profile";

type ModalState = {
  type: "stock" | "mf" | "property" | null;
  mode: "add" | "edit";
  asset?: Asset;
} | null;

export interface MobileDashboardProps {
  user: { id: number; name?: string; email: string; role?: string } | null;
  isAdmin: boolean;
  selectedClient: any | null;
  onClientChange: (client: any) => void;
  assets: Asset[];
  insights: InsightsResponse | null;
  loading: boolean;
  error: string | null;
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnPct: number;
  allocation?: AssetsAllocation;
  onAdd: (payload: CreateAssetPayload) => Promise<void>;
  onEdit: (id: number, payload: UpdateAssetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onLogout: () => void;
}

/* ── helpers ────────────────────────────────────────────────────────── */

function fmt(n: number | undefined | null, prefix = "₹") {
  if (n == null) return "—";
  return `${prefix}${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

function fmtCompact(n: number) {
  if (!Number.isFinite(n)) return "₹0";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

/** Returns `value` when it is a finite number, otherwise `fallback` (default 0). */
function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Returns `[] when arr is not an array, applying the filter otherwise. */
function filterAssetsByType(arr: Asset[], type: Asset["type"]): Asset[] {
  return Array.isArray(arr) ? arr.filter((a) => a.type === type) : [];
}

function gainColor(n: number) {
  return n >= 0 ? "#4ade80" : "#f87171";
}

function gainSign(n: number) {
  return n >= 0 ? "+" : "";
}

/* ── nav config ─────────────────────────────────────────────────────── */

const NAV_ITEMS: {
  id: MobileTab;
  label: string;
  icon: (active: boolean) => ReactNode;
}[] = [
  {
    id: "dashboard",
    label: "Home",
    icon: (active) => (
      <svg
        className="w-5 h-5"
        fill={active ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    id: "stocks",
    label: "Stocks",
    icon: (active) => (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941"
        />
      </svg>
    ),
  },
  {
    id: "mutual_funds",
    label: "Funds",
    icon: (active) => (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
        />
      </svg>
    ),
  },
  {
    id: "real_estate",
    label: "Property",
    icon: (active) => (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (active) => (
      <svg
        className="w-5 h-5"
        fill={active ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
  },
];

/* ── asset cards ────────────────────────────────────────────────────── */

interface CardProps {
  key?: string | number;
  asset: Asset;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function StockCard({
  asset,
  deleting,
  onEdit,
  onDelete,
}: CardProps) {
  const invested = (asset.quantity ?? 0) * (asset.avgPrice ?? 0);
  const gain = (asset.value ?? 0) - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col gap-3"
      style={{ borderRadius: 12 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono font-bold text-white text-sm leading-tight">
            {asset.symbol ?? asset.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{asset.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-white text-sm">{fmt(asset.value)}</p>
          <p
            className="text-xs font-semibold mt-0.5"
            style={{ color: gainColor(gainPct) }}
          >
            {gainSign(gainPct)}{gainPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{asset.quantity ?? "—"} shares</span>
        <span>·</span>
        <span>avg {fmt(asset.avgPrice)}</span>
        {(asset.tags ?? []).length > 0 && (
          <>
            <span>·</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                background: "rgba(56,189,248,0.12)",
                color: "#7dd3fc",
              }}
            >
              {asset.tags![0]}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={onEdit}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors"
          style={{
            background: "rgba(56,189,248,0.1)",
            color: "#7dd3fc",
            border: "1px solid rgba(56,189,248,0.2)",
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function MFCard({
  asset,
  deleting,
  onEdit,
  onDelete,
}: CardProps) {
  const invested = (asset.quantity ?? 0) * (asset.avgPrice ?? 0);
  const gain = (asset.value ?? 0) - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col gap-3"
      style={{ borderRadius: 12 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white text-sm leading-tight truncate">
            {asset.name}
          </p>
          {asset.symbol && (
            <p className="text-xs font-mono text-gray-400 mt-0.5">{asset.symbol}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-white text-sm">{fmt(asset.value)}</p>
          <p
            className="text-xs font-semibold mt-0.5"
            style={{ color: gainColor(gainPct) }}
          >
            {gainSign(gainPct)}{gainPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{asset.quantity ?? "—"} units</span>
        <span>·</span>
        <span>avg NAV {fmt(asset.avgPrice)}</span>
      </div>

      <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={onEdit}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg"
          style={{
            background: "rgba(56,189,248,0.1)",
            color: "#7dd3fc",
            border: "1px solid rgba(56,189,248,0.2)",
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function PropertyCard({
  asset,
  deleting,
  onEdit,
  onDelete,
}: CardProps) {
  const appreciation =
    asset.currentValue != null &&
    asset.purchasePrice != null &&
    asset.purchasePrice > 0
      ? ((asset.currentValue - asset.purchasePrice) / asset.purchasePrice) * 100
      : null;

  const rentDue = asset.rentDueDate ? new Date(asset.rentDueDate) : null;
  const rentLate = rentDue ? rentDue < new Date() : false;

  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col gap-3"
      style={{ borderRadius: 12 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white text-sm leading-tight truncate">
            {asset.name}
          </p>
          {asset.location && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              📍 {asset.location}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-white text-sm">
            {fmt(asset.currentValue)}
          </p>
          {appreciation != null && (
            <p
              className="text-xs font-semibold mt-0.5"
              style={{ color: gainColor(appreciation) }}
            >
              {gainSign(appreciation)}{appreciation.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {asset.rentAmount != null && (
          <div
            className="rounded-lg p-2.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs text-gray-500">Monthly Rent</p>
            <p className="text-sm font-bold text-white mt-0.5">{fmt(asset.rentAmount)}</p>
          </div>
        )}
        {asset.rentDueDate && (
          <div
            className="rounded-lg p-2.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs text-gray-500">Rent Status</p>
            <p
              className="text-sm font-bold mt-0.5"
              style={{ color: rentLate ? "#f87171" : "#4ade80" }}
            >
              {rentLate ? "Late" : "Paid"}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={onEdit}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg"
          style={{
            background: "rgba(56,189,248,0.1)",
            color: "#7dd3fc",
            border: "1px solid rgba(56,189,248,0.2)",
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

/* ── empty state ────────────────────────────────────────────────────── */

function MobileEmptyState({
  label,
  onAdd,
}: {
  label: string;
  onAdd: () => void;
}) {
  return (
    <div
      className="glass-card rounded-xl p-8 flex flex-col items-center gap-4 text-center"
      style={{ borderRadius: 12 }}
    >
      <p className="text-gray-400 text-sm">No {label} yet.</p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 text-sm font-semibold rounded-xl"
        style={{ background: "#38bdf8", color: "#071a14" }}
      >
        + Add {label}
      </button>
    </div>
  );
}

/* ── skeleton loaders ───────────────────────────────────────────────── */

function SkeletonHeader() {
  return (
    <div className="animate-pulse flex items-start justify-between gap-2">
      <div className="space-y-2 min-w-0">
        <div className="h-3 rounded w-16" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-5 rounded w-28" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>
      <div className="space-y-2 shrink-0 text-right">
        <div className="h-3 rounded w-24 ml-auto" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-6 rounded w-20 ml-auto" style={{ background: "rgba(255,255,255,0.12)" }} />
        <div className="h-3 rounded w-12 ml-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col gap-3 animate-pulse"
      style={{ borderRadius: 12 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded w-2/3" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="h-3 rounded w-1/2" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="shrink-0 space-y-2">
          <div className="h-4 rounded w-20" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="h-3 rounded w-12 ml-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
      </div>
      <div className="h-3 rounded w-full" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="flex gap-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex-1 h-7 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="flex-1 h-7 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────── */

export default function MobileDashboard({
  user,
  isAdmin,
  selectedClient,
  onClientChange,
  assets,
  insights,
  loading,
  error,
  totalValue,
  totalReturn,
  returnPct,
  allocation,
  onAdd,
  onEdit,
  onDelete,
  onLogout,
}: MobileDashboardProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("dashboard");
  const [modal, setModal] = useState<ModalState>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const clientName =
    isAdmin && selectedClient
      ? selectedClient.name
      : user?.name ?? user?.email ?? "Welcome";

  const stocks = useMemo(() => filterAssetsByType(assets, "stock"), [assets]);
  const mfs = useMemo(() => filterAssetsByType(assets, "mf"), [assets]);
  const properties = useMemo(() => filterAssetsByType(assets, "property"), [assets]);

  const metrics = useMemo(() => {
    const topAssetClass = allocation
      ? Object.entries(allocation).sort((a, b) => b[1] - a[1])[0]
      : null;
    const topAssetLabel = topAssetClass
      ? ({ stock: "Stocks", mf: "Funds", real_estate: "Property" }[
          topAssetClass[0] as keyof typeof allocation
        ] ?? topAssetClass[0])
      : "—";
    const topAssetPct = safeNumber(topAssetClass ? topAssetClass[1] : 0);
    const stockPct = safeNumber(allocation?.stock);
    const riskLabel = stockPct > 60 ? "High" : stockPct > 35 ? "Medium" : "Low";
    const riskColor = stockPct > 60 ? "#f87171" : stockPct > 35 ? "#fbbf24" : "#4ade80";
    return { topAssetLabel, topAssetPct, stockPct, riskLabel, riskColor };
  }, [allocation]);

  const { topAssetLabel, topAssetPct, stockPct, riskLabel, riskColor } = metrics;
  const safeReturnPct = safeNumber(returnPct);

  function openAdd() {
    if (activeTab === "stocks") setModal({ type: "stock", mode: "add" });
    else if (activeTab === "mutual_funds") setModal({ type: "mf", mode: "add" });
    else if (activeTab === "real_estate") setModal({ type: "property", mode: "add" });
    else setModal({ type: null, mode: "add" });
  }

  async function handleAddSave(payload: CreateAssetPayload | UpdateAssetPayload) {
    if (!payload.type || !payload.name) return;
    await onAdd(payload as CreateAssetPayload);
    setModal(null);
  }

  async function handleEditSave(
    payload: CreateAssetPayload | UpdateAssetPayload
  ) {
    if (!modal || modal.mode !== "edit" || !modal.asset) return;
    await onEdit(modal.asset.id, payload as UpdateAssetPayload);
    setModal(null);
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
    <div
      className="min-h-screen bg-[#071a14] text-white flex flex-col"
      style={{ maxWidth: "100vw", overflowX: "hidden" }}
    >
      {/* ── Sticky Header ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{
          background: "rgba(7,26,20,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(56,189,248,0.1)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          {loading ? (
            <SkeletonHeader />
          ) : (
            <>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">
                  {isAdmin && selectedClient ? "Client" : "Portfolio"}
                </p>
                <p className="text-base font-bold text-white truncate leading-tight mt-0.5">
                  {clientName}
                  {isAdmin && (
                    <span
                      className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold align-middle"
                      style={{
                        background: "rgba(56,189,248,0.12)",
                        color: "#7dd3fc",
                        border: "1px solid rgba(56,189,248,0.2)",
                      }}
                    >
                      Admin
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">Portfolio Value</p>
                <p className="text-lg font-bold text-white leading-tight mt-0.5">
                  {fmtCompact(totalValue)}
                </p>
                <p
                  className="text-xs font-semibold"
                  style={{ color: gainColor(safeReturnPct) }}
                >
                  {gainSign(safeReturnPct)}{safeReturnPct.toFixed(1)}%
                </p>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Scrollable Content ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 88 }}>
        {!loading && error && (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        )}

        {/* Admin: no client selected */}
        {!loading && !error && isAdmin && !selectedClient && activeTab !== "profile" && (
          <div className="p-4">
            <div
              className="glass-card rounded-xl p-6 text-center"
              style={{ borderRadius: 12 }}
            >
              <p className="text-gray-400 text-sm mb-3">
                Select a client to view their portfolio.
              </p>
              <button
                onClick={() => setActiveTab("profile")}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl"
                style={{ background: "#38bdf8", color: "#071a14" }}
              >
                Select Client
              </button>
            </div>
          </div>
        )}

        {/* ── Dashboard Tab ──────────────────────────────────────── */}
        {activeTab === "dashboard" && !error && (isAdmin ? !!selectedClient : true) && (
          <div className="p-4 space-y-4">
            {loading ? (
              <>
                <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="glass-card rounded-xl p-4 shrink-0 flex flex-col gap-2 animate-pulse"
                      style={{ borderRadius: 12, minWidth: 140 }}
                    >
                      <div className="h-3 rounded w-12" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-6 rounded w-20" style={{ background: "rgba(255,255,255,0.12)" }} />
                      <div className="h-3 rounded w-16" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Metric scroll cards */}
                <div
                  className="flex gap-3 overflow-x-auto"
                  style={{ paddingBottom: 4, scrollbarWidth: "none" }}
                >
                  {/* AUM */}
                  <div
                    className="glass-card rounded-xl p-4 shrink-0 flex flex-col gap-1"
                    style={{ borderRadius: 12, minWidth: 140 }}
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wide">AUM</p>
                    <p className="text-lg font-bold text-white">{fmtCompact(totalValue)}</p>
                    <p className="text-xs" style={{ color: "#7dd3fc" }}>
                      Total value
                    </p>
                  </div>

                  {/* Returns */}
                  <div
                    className="glass-card rounded-xl p-4 shrink-0 flex flex-col gap-1"
                    style={{ borderRadius: 12, minWidth: 140 }}
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Returns</p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: gainColor(safeReturnPct) }}
                    >
                      {gainSign(safeReturnPct)}{safeReturnPct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {fmtCompact(Math.abs(totalReturn))} {totalReturn >= 0 ? "gain" : "loss"}
                    </p>
                  </div>

                  {/* Allocation */}
                  <div
                    className="glass-card rounded-xl p-4 shrink-0 flex flex-col gap-1"
                    style={{ borderRadius: 12, minWidth: 140 }}
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Allocation
                    </p>
                    <p className="text-lg font-bold text-white">
                      {topAssetPct.toFixed(0)}%
                    </p>
                    <p className="text-xs" style={{ color: "#7dd3fc" }}>
                      {topAssetLabel}
                    </p>
                  </div>

                  {/* Risk */}
                  <div
                    className="glass-card rounded-xl p-4 shrink-0 flex flex-col gap-1"
                    style={{ borderRadius: 12, minWidth: 140 }}
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Risk</p>
                    <p className="text-lg font-bold" style={{ color: riskColor }}>
                      {riskLabel}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stockPct.toFixed(0)}% in equities
                    </p>
                  </div>
                </div>

                {/* Allocation chart */}
                {Array.isArray(assets) && assets.length > 0 && (
                  <AllocationChart allocation={allocation} />
                )}

                {/* AI Insights */}
                {Array.isArray(assets) && assets.length > 0 && (
                  <AIInsightsPanel insights={insights} />
                )}

                {/* Empty portfolio */}
                {(!Array.isArray(assets) || assets.length === 0) && (
                  <div
                    className="glass-card rounded-xl p-8 text-center"
                    style={{ borderRadius: 12 }}
                  >
                    <p className="text-gray-400 text-sm mb-3">
                      No assets yet. Add your first investment.
                    </p>
                    <button
                      onClick={openAdd}
                      className="px-5 py-2.5 text-sm font-semibold rounded-xl"
                      style={{ background: "#38bdf8", color: "#071a14" }}
                    >
                      + Add Asset
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Stocks Tab ─────────────────────────────────────────── */}
        {activeTab === "stocks" && !error && (isAdmin ? !!selectedClient : true) && (
          <div className="p-4 flex flex-col gap-3">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  {stocks.length} holding{stocks.length !== 1 ? "s" : ""}
                </p>
                {stocks.length === 0 ? (
                  <MobileEmptyState
                    label="Stock"
                    onAdd={() => setModal({ type: "stock", mode: "add" })}
                  />
                ) : (
                  stocks.map((a) => (
                    <StockCard
                      key={a.id}
                      asset={a}
                      deleting={deletingId === a.id}
                      onEdit={() => setModal({ type: "stock", mode: "edit", asset: a })}
                      onDelete={() => { void handleDelete(a.id); }}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* ── Mutual Funds Tab ───────────────────────────────────── */}
        {activeTab === "mutual_funds" && !error && (isAdmin ? !!selectedClient : true) && (
          <div className="p-4 flex flex-col gap-3">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  {mfs.length} fund{mfs.length !== 1 ? "s" : ""}
                </p>
                {mfs.length === 0 ? (
                  <MobileEmptyState
                    label="Fund"
                    onAdd={() => setModal({ type: "mf", mode: "add" })}
                  />
                ) : (
                  mfs.map((a) => (
                    <MFCard
                      key={a.id}
                      asset={a}
                      deleting={deletingId === a.id}
                      onEdit={() => setModal({ type: "mf", mode: "edit", asset: a })}
                      onDelete={() => { void handleDelete(a.id); }}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* ── Real Estate Tab ────────────────────────────────────── */}
        {activeTab === "real_estate" && !error && (isAdmin ? !!selectedClient : true) && (
          <div className="p-4 flex flex-col gap-3">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  {properties.length} propert{properties.length !== 1 ? "ies" : "y"}
                </p>
                {properties.length === 0 ? (
                  <MobileEmptyState
                    label="Property"
                    onAdd={() => setModal({ type: "property", mode: "add" })}
                  />
                ) : (
                  properties.map((a) => (
                    <PropertyCard
                      key={a.id}
                      asset={a}
                      deleting={deletingId === a.id}
                      onEdit={() => setModal({ type: "property", mode: "edit", asset: a })}
                      onDelete={() => { void handleDelete(a.id); }}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* ── Profile Tab ────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="p-4 space-y-4">
            {/* User card */}
            <div
              className="glass-card rounded-xl p-4 flex items-center gap-4"
              style={{ borderRadius: 12 }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold"
                style={{ background: "rgba(56,189,248,0.15)", color: "#7dd3fc" }}
              >
                {(user?.name ?? user?.email ?? "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white truncate">
                  {user?.name ?? "User"}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                {isAdmin && (
                  <span
                    className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: "rgba(56,189,248,0.12)",
                      color: "#7dd3fc",
                      border: "1px solid rgba(56,189,248,0.2)",
                    }}
                  >
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Admin: client selector */}
            {isAdmin && (
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderRadius: 12 }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "#7dd3fc" }}>
                  Select Client
                </p>
                <ClientSelector
                  selectedId={selectedClient?.id ?? null}
                  onChange={(c) => {
                    onClientChange(c);
                    setActiveTab("dashboard");
                  }}
                />
              </div>
            )}

            {/* Logout */}
            <button
              onClick={onLogout}
              className="w-full py-3 text-sm font-semibold rounded-xl transition-colors"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12,
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </main>

      {/* ── FAB ────────────────────────────────────────────────────── */}
      {activeTab !== "profile" && !loading && !error && (isAdmin ? !!selectedClient : true) && (
        <button
          onClick={openAdd}
          className="fixed z-50 flex items-center justify-center shadow-lg"
          style={{
            bottom: 80,
            right: 16,
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#38bdf8",
            color: "#071a14",
            boxShadow: "0 4px 20px rgba(56,189,248,0.5)",
          }}
          aria-label="Add asset"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {/* ── Bottom Navigation ──────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around"
        style={{
          height: 64,
          background: "rgba(7,26,20,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(56,189,248,0.12)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center gap-1 px-3 py-1 transition-colors"
              style={{ color: active ? "#38bdf8" : "rgba(255,255,255,0.35)" }}
            >
              {item.icon(active)}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {modal?.mode === "add" && modal.type === null && (
        <AddAssetModal
          onClose={() => setModal(null)}
          onSave={handleAddSave}
        />
      )}
      {modal?.mode === "add" && modal.type === "stock" && (
        <StockModal
          onClose={() => setModal(null)}
          onSave={handleAddSave}
        />
      )}
      {modal?.mode === "add" && modal.type === "mf" && (
        <MFModal
          onClose={() => setModal(null)}
          onSave={handleAddSave}
        />
      )}
      {modal?.mode === "add" && modal.type === "property" && (
        <RealEstateModal
          onClose={() => setModal(null)}
          onSave={handleAddSave}
        />
      )}
      {modal?.mode === "edit" && modal.type === "stock" && modal.asset && (
        <StockModal
          asset={modal.asset}
          onClose={() => setModal(null)}
          onSave={handleEditSave}
        />
      )}
      {modal?.mode === "edit" && modal.type === "mf" && modal.asset && (
        <MFModal
          asset={modal.asset}
          onClose={() => setModal(null)}
          onSave={handleEditSave}
        />
      )}
      {modal?.mode === "edit" && modal.type === "property" && modal.asset && (
        <RealEstateModal
          asset={modal.asset}
          onClose={() => setModal(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
