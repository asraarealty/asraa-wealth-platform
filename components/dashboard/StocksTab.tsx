"use client";

import { useState, useMemo } from "react";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";
import EmptyState from "@/components/ui/EmptyState";
import StockModal from "./modals/StockModal";
import CommodityModal from "./modals/CommodityModal";

interface StocksTabProps {
  assets: Asset[];
  onAdd: (payload: CreateAssetPayload) => Promise<void>;
  onEdit: (id: number, payload: UpdateAssetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtINR(n: number | undefined | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function fmtPct(n: number, withSign = false) {
  const sign = withSign && n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// ── Intelligence derivation (display only) ───────────────────────────────────

function computeReturnPct(a: Asset): number {
  const cost = (a.avgPrice ?? 0) * (a.quantity ?? 0);
  if (cost === 0) return 0;
  const current =
    a.currentPrice != null ? a.currentPrice * (a.quantity ?? 0) : a.value;
  return ((current - cost) / cost) * 100;
}

function computePnL(a: Asset): number {
  const cost = (a.avgPrice ?? 0) * (a.quantity ?? 0);
  const current =
    a.currentPrice != null ? a.currentPrice * (a.quantity ?? 0) : a.value;
  return current - cost;
}

function getConfidence(returnPct: number): {
  score: number;
  label: string;
  color: string;
  bg: string;
} {
  if (returnPct > 20)
    return { score: 9, label: "9/10", color: "#00ff9f", bg: "rgba(0,255,159,0.08)" };
  if (returnPct > 10)
    return { score: 8, label: "8/10", color: "#00E5FF", bg: "rgba(0,229,255,0.08)" };
  if (returnPct > 3)
    return { score: 6, label: "6/10", color: "#4F8CFF", bg: "rgba(79,140,255,0.08)" };
  if (returnPct >= 0)
    return { score: 5, label: "5/10", color: "#a855f7", bg: "rgba(168,85,247,0.08)" };
  if (returnPct > -10)
    return { score: 3, label: "3/10", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" };
  return { score: 1, label: "1/10", color: "#ff4d6d", bg: "rgba(255,77,109,0.08)" };
}

function getRisk(allocation: number): {
  label: "Low" | "Medium" | "High";
  color: string;
  bg: string;
  border: string;
} {
  if (allocation > 25)
    return {
      label: "High",
      color: "#ff4d6d",
      bg: "rgba(255,77,109,0.08)",
      border: "rgba(255,77,109,0.2)",
    };
  if (allocation > 12)
    return {
      label: "Medium",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.2)",
    };
  return {
    label: "Low",
    color: "#00ff9f",
    bg: "rgba(0,255,159,0.08)",
    border: "rgba(0,255,159,0.2)",
  };
}

function getAction(
  returnPct: number,
  allocation: number
): { label: "BUY" | "HOLD" | "REDUCE"; color: string; bg: string; border: string } {
  if (returnPct < -8)
    return {
      label: "REDUCE",
      color: "#ff4d6d",
      bg: "rgba(255,77,109,0.08)",
      border: "rgba(255,77,109,0.2)",
    };
  if (returnPct > 8 && allocation < 20)
    return {
      label: "BUY",
      color: "#00ff9f",
      bg: "rgba(0,255,159,0.08)",
      border: "rgba(0,255,159,0.2)",
    };
  return {
    label: "HOLD",
    color: "#00E5FF",
    bg: "rgba(0,229,255,0.08)",
    border: "rgba(0,229,255,0.2)",
  };
}

function getPortfolioScore(avgReturn: number): {
  grade: string;
  label: string;
  color: string;
} {
  if (avgReturn > 20)
    return { grade: "A+", label: "Excellent", color: "#00ff9f" };
  if (avgReturn > 10)
    return { grade: "A", label: "Very Good", color: "#00E5FF" };
  if (avgReturn > 5)
    return { grade: "B", label: "Good", color: "#4F8CFF" };
  if (avgReturn > 0)
    return { grade: "C", label: "Fair", color: "#fbbf24" };
  return { grade: "D", label: "Needs Review", color: "#ff4d6d" };
}

function getOverallRisk(stocks: Asset[]): { label: string; color: string } {
  const highRisk = stocks.filter((a) => a.allocation > 25).length;
  const medRisk = stocks.filter(
    (a) => a.allocation > 12 && a.allocation <= 25
  ).length;
  if (highRisk >= 2) return { label: "High", color: "#ff4d6d" };
  if (highRisk >= 1 || medRisk >= 3) return { label: "Medium", color: "#fbbf24" };
  return { label: "Low", color: "#00ff9f" };
}

// ── Mini performance chart ────────────────────────────────────────────────────

const GROWTH_SHAPE = [
  { month: "May", v: 100 },
  { month: "Jun", v: 103 },
  { month: "Jul", v: 101 },
  { month: "Aug", v: 108 },
  { month: "Sep", v: 112 },
  { month: "Oct", v: 109 },
  { month: "Nov", v: 116 },
  { month: "Dec", v: 121 },
  { month: "Jan", v: 118 },
  { month: "Feb", v: 124 },
  { month: "Mar", v: 129 },
  { month: "Apr", v: 135 },
];

type TimeFilter = "3M" | "6M" | "1Y" | "ALL";
const FILTER_SLICES: Record<TimeFilter, number> = { "3M": 3, "6M": 6, "1Y": 12, ALL: 12 };

function StocksChart({
  totalValue,
  gainPercent,
}: {
  totalValue: number;
  gainPercent: number;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    val: number;
  } | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1Y");

  const data = useMemo(() => {
    const slice = GROWTH_SHAPE.slice(-FILTER_SLICES[timeFilter]);
    const latest = slice[slice.length - 1].v;
    return slice.map((d) => ({ month: d.month, value: (d.v / latest) * totalValue }));
  }, [timeFilter, totalValue]);

  const W = 600,
    H = 160,
    PX = 48,
    PY = 16;
  const minV = Math.min(...data.map((d) => d.value));
  const maxV = Math.max(...data.map((d) => d.value));
  const range = maxV - minV || 1;
  const toX = (i: number) => PX + (i / (data.length - 1)) * (W - PX * 2);
  const toY = (v: number) => PY + (1 - (v - minV) / range) * (H - PY * 2);

  const linePath = data.reduce((p, d, i) => {
    if (i === 0) return `M ${toX(i)} ${toY(d.value)}`;
    const prev = data[i - 1];
    const cpX = (toX(i - 1) + toX(i)) / 2;
    return `${p} C ${cpX} ${toY(prev.value)}, ${cpX} ${toY(d.value)}, ${toX(i)} ${toY(d.value)}`;
  }, "");

  const areaPath = `${linePath} L ${toX(data.length - 1)} ${H - PY} L ${toX(0)} ${H - PY} Z`;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - PX) / (W - PX * 2)) * (data.length - 1));
    const i = Math.max(0, Math.min(data.length - 1, idx));
    setTooltip({
      x: toX(i),
      y: toY(data[i].value),
      label: data[i].month,
      val: data[i].value,
    });
  }

  return (
    <div
      className="glass-card card-hover rounded-2xl p-5"
      style={{ border: "1px solid rgba(0,229,255,0.08)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: "rgba(0,229,255,0.55)" }}
          >
            Portfolio Performance
          </p>
          <p className="text-xl font-bold text-white mt-1">{fmtINR(totalValue)}</p>
        </div>
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={
            gainPercent >= 0
              ? {
                  background: "rgba(0,255,159,0.08)",
                  color: "#00ff9f",
                  border: "1px solid rgba(0,255,159,0.2)",
                }
              : {
                  background: "rgba(255,77,109,0.08)",
                  color: "#ff4d6d",
                  border: "1px solid rgba(255,77,109,0.2)",
                }
          }
        >
          {gainPercent >= 0 ? "▲" : "▼"} {Math.abs(gainPercent).toFixed(1)}%
        </span>
      </div>

      {/* Time filters */}
      <div className="flex gap-1.5 mb-4">
        {(["3M", "6M", "1Y", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className="px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200"
            style={
              timeFilter === f
                ? {
                    background: "rgba(0,229,255,0.12)",
                    color: "#00E5FF",
                    border: "1px solid rgba(0,229,255,0.25)",
                  }
                : {
                    background: "transparent",
                    color: "rgba(255,255,255,0.35)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ height: 130 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          aria-label="Stock portfolio performance chart"
        >
          <defs>
            <linearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.15" />
              <stop offset="80%" stopColor="#00E5FF" stopOpacity="0.01" />
            </linearGradient>
            <filter id="stockLineGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.33, 0.67, 1].map((t) => (
            <line
              key={t}
              x1={PX}
              y1={PY + t * (H - PY * 2)}
              x2={W - PX}
              y2={PY + t * (H - PY * 2)}
              stroke="rgba(0,229,255,0.05)"
              strokeWidth={1}
              strokeDasharray={t === 0 || t === 1 ? "none" : "4 6"}
            />
          ))}

          <path d={areaPath} fill="url(#stockAreaGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#stockLineGlow)"
            strokeDasharray="1200"
            className="animate-draw-line"
          />

          {data.map((d, i) =>
            i % 2 === 0 ? (
              <text
                key={d.month}
                x={toX(i)}
                y={H - 2}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(255,255,255,0.2)"
              >
                {d.month}
              </text>
            ) : null
          )}

          {tooltip && (
            <>
              <line
                x1={tooltip.x}
                y1={PY}
                x2={tooltip.x}
                y2={H - PY}
                stroke="rgba(0,229,255,0.3)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={tooltip.x}
                cy={tooltip.y}
                r={5}
                fill="#00E5FF"
                filter="url(#stockLineGlow)"
              />
              <circle
                cx={tooltip.x}
                cy={tooltip.y}
                r={9}
                fill="none"
                stroke="#00E5FF"
                strokeOpacity={0.25}
                strokeWidth={1.5}
              />
            </>
          )}
        </svg>

        {/* Floating tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-xl px-3 py-2 text-xs"
            style={{
              background: "rgba(5,11,24,0.92)",
              border: "1px solid rgba(0,229,255,0.2)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <p className="text-white/50 mb-0.5">{tooltip.label}</p>
            <p className="font-semibold" style={{ color: "#00E5FF" }}>
              {fmtINR(tooltip.val)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI Item card ─────────────────────────────────────────────────────────────

function KPIItem({
  label,
  value,
  sub,
  accent = "#00E5FF",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="glass-card card-hover rounded-2xl p-4 flex flex-col gap-2"
      style={{ border: `1px solid ${accent}18` }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: `${accent}88` }}
      >
        {label}
      </p>
      <div className="text-lg font-bold text-white leading-tight">{value}</div>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
}

// ── Stock Detail Panel ────────────────────────────────────────────────────────

function StockDetailPanel({
  stock,
  onClose,
}: {
  stock: Asset;
  onClose: () => void;
}) {
  const returnPct = computeReturnPct(stock);
  const pnl = computePnL(stock);
  const confidence = getConfidence(returnPct);
  const risk = getRisk(stock.allocation);
  const action = getAction(returnPct, stock.allocation);
  const entrySignal =
    action.label === "BUY"
      ? "Strong momentum — consider adding at current levels"
      : action.label === "REDUCE"
      ? "Below cost basis — review position sizing"
      : "Holding at target allocation — monitor for drift";

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-sm shadow-2xl animate-float-up"
      style={{
        background: "rgba(5,11,24,0.97)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderLeft: "1px solid rgba(0,229,255,0.1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div>
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "rgba(0,229,255,0.5)" }}
          >
            Stock Detail
          </p>
          <h3 className="text-xl font-bold text-white mt-0.5">
            {stock.symbol ?? stock.name}
          </h3>
          {stock.symbol && (
            <p className="text-sm text-white/40">{stock.name}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          aria-label="Close panel"
        >
          <svg
            className="w-4 h-4 text-white/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto h-full pb-24 px-6 py-5 space-y-5">
        {/* Action banner */}
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: action.bg,
            border: `1px solid ${action.border}`,
          }}
        >
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: action.color }}
            >
              Recommendation
            </p>
            <p className="text-2xl font-extrabold" style={{ color: action.color }}>
              {action.label}
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: `${action.color}10`,
              border: `1px solid ${action.color}25`,
            }}
          >
            {action.label === "BUY" ? "📈" : action.label === "REDUCE" ? "📉" : "⏸"}
          </div>
        </div>

        {/* Entry signal */}
        <div
          className="rounded-xl px-4 py-3 text-xs text-white/50 leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span
            className="font-semibold"
            style={{ color: "rgba(0,229,255,0.7)" }}
          >
            Signal:{" "}
          </span>
          {entrySignal}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Quantity", value: (stock.quantity ?? 0).toLocaleString("en-IN") },
            { label: "Avg Price", value: fmtINR(stock.avgPrice) },
            { label: "Current Price", value: fmtINR(stock.currentPrice ?? 0) },
            { label: "Market Value", value: fmtINR(stock.value) },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-xs text-white/35 mb-1">{m.label}</p>
              <p className="text-sm font-semibold text-white">{m.value}</p>
            </div>
          ))}
        </div>

        {/* P&L */}
        <div
          className="rounded-xl p-4"
          style={{
            background: pnl >= 0 ? "rgba(0,255,159,0.06)" : "rgba(255,77,109,0.06)",
            border: `1px solid ${pnl >= 0 ? "rgba(0,255,159,0.15)" : "rgba(255,77,109,0.15)"}`,
          }}
        >
          <p className="text-xs text-white/40 mb-1">Total P&amp;L</p>
          <p
            className="text-xl font-bold"
            style={{ color: pnl >= 0 ? "#00ff9f" : "#ff4d6d" }}
          >
            {pnl >= 0 ? "+" : ""}
            {fmtINR(pnl)}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: pnl >= 0 ? "rgba(0,255,159,0.5)" : "rgba(255,77,109,0.5)" }}
          >
            {fmtPct(returnPct, true)}
          </p>
        </div>

        {/* Intelligence section */}
        <div className="space-y-2.5">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "rgba(0,229,255,0.5)" }}
          >
            Intelligence
          </p>
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span className="text-sm text-white/60">⭐ Confidence</span>
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{
                background: confidence.bg,
                color: confidence.color,
                border: `1px solid ${confidence.color}30`,
              }}
            >
              {confidence.label}
            </span>
          </div>
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span className="text-sm text-white/60">⚠️ Risk Level</span>
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{
                background: risk.bg,
                color: risk.color,
                border: `1px solid ${risk.border}`,
              }}
            >
              {risk.label}
            </span>
          </div>
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span className="text-sm text-white/60">📊 Allocation</span>
            <span className="text-sm font-semibold text-white">
              {stock.allocation.toFixed(1)}% of portfolio
            </span>
          </div>
        </div>

        {/* Tags */}
        {(stock.tags ?? []).length > 0 && (
          <div className="space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(0,229,255,0.5)" }}
            >
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(stock.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(0,229,255,0.07)",
                    color: "rgba(0,229,255,0.6)",
                    border: "1px solid rgba(0,229,255,0.15)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sorting helpers ───────────────────────────────────────────────────────────

type SortKey = "name" | "value" | "returnPct" | "pnl" | "confidence" | "risk";
type SortDir = "asc" | "desc";
type FilterMode = "all" | "gain" | "loss" | "high-risk" | "buy" | "reduce";

function isCommodityAsset(asset: Asset | null): boolean {
  if (!asset) return false;
  return (asset.tags ?? []).some((tag) => tag.toLowerCase() === "commodity");
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StocksTab({
  assets,
  onAdd,
  onEdit,
  onDelete,
}: StocksTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedStock, setSelectedStock] = useState<Asset | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const stocks = assets.filter((a) => a.type === "stock");

  // KPI computations
  const totalValue = useMemo(
    () => stocks.reduce((s, a) => s + a.value, 0),
    [stocks]
  );
  const totalPnL = useMemo(
    () => stocks.reduce((s, a) => s + computePnL(a), 0),
    [stocks]
  );
  const totalInvested = useMemo(
    () => stocks.reduce((s, a) => s + (a.avgPrice ?? 0) * (a.quantity ?? 0), 0),
    [stocks]
  );
  const avgReturn = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const portfolioScore = getPortfolioScore(avgReturn);
  const overallRisk = getOverallRisk(stocks);

  // Sort handler
  function handleSort(key: SortKey) {
    if (sortKey === key)
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Enrich, filter and sort
  const enriched = useMemo(
    () =>
      stocks.map((a) => {
        const rPct = computeReturnPct(a);
        return {
          asset: a,
          returnPct: rPct,
          pnl: computePnL(a),
          confidence: getConfidence(rPct),
          risk: getRisk(a.allocation),
          action: getAction(rPct, a.allocation),
        };
      }),
    [stocks]
  );

  const filtered = useMemo(() => {
    switch (filterMode) {
      case "gain":
        return enriched.filter((e) => e.returnPct >= 0);
      case "loss":
        return enriched.filter((e) => e.returnPct < 0);
      case "high-risk":
        return enriched.filter((e) => e.risk.label === "High");
      case "buy":
        return enriched.filter((e) => e.action.label === "BUY");
      case "reduce":
        return enriched.filter((e) => e.action.label === "REDUCE");
      default:
        return enriched;
    }
  }, [enriched, filterMode]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        let av: number | string = 0,
          bv: number | string = 0;
        if (sortKey === "name") {
          av = a.asset.name.toLowerCase();
          bv = b.asset.name.toLowerCase();
        } else if (sortKey === "value") {
          av = a.asset.value;
          bv = b.asset.value;
        } else if (sortKey === "returnPct") {
          av = a.returnPct;
          bv = b.returnPct;
        } else if (sortKey === "pnl") {
          av = a.pnl;
          bv = b.pnl;
        } else if (sortKey === "confidence") {
          av = a.confidence.score;
          bv = b.confidence.score;
        } else if (sortKey === "risk") {
          const rmap = { Low: 0, Medium: 1, High: 2 };
          av = rmap[a.risk.label];
          bv = rmap[b.risk.label];
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      }),
    [filtered, sortKey, sortDir]
  );

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

  const FILTER_OPTIONS: { id: FilterMode; label: string }[] = [
    { id: "all", label: "All" },
    { id: "gain", label: "▲ Gains" },
    { id: "loss", label: "▼ Losses" },
    { id: "high-risk", label: "⚠ High Risk" },
    { id: "buy", label: "💡 Buy" },
    { id: "reduce", label: "📉 Reduce" },
  ];

  // Sort-able column header
  function SortTh({ label, sk }: { label: string; sk: SortKey }) {
    return (
      <th
        onClick={() => handleSort(sk)}
        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap cursor-pointer select-none"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          color: sortKey === sk ? "#00E5FF" : "rgba(255,255,255,0.3)",
          transition: "color 0.2s",
        }}
      >
        {label}
        {sortKey === sk && (
          <span className="ml-1 text-[10px]">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </th>
    );
  }

  function StaticTh({ label }: { label: string }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        {label}
      </th>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (stocks.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/30">No equity holdings</p>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl neon-btn"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Stock
          </button>
        </div>
        <EmptyState
          title="No stocks yet"
          description={`Click "+ Add Stock" to track your equity holdings.`}
          action={
            <button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 text-sm font-semibold rounded-xl neon-btn"
            >
              + Add Stock
            </button>
          }
        />
        {modalOpen && (
          isCommodityAsset(editing) ? (
            <CommodityModal
              asset={editing}
              onClose={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              onSave={handleSave}
            />
          ) : (
            <StockModal
              asset={editing}
              onClose={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              onSave={handleSave}
            />
          )
        )}
      </div>
    );
  }

  // ── Full UI ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPIItem
          label="Total Value"
          value={fmtINR(totalValue)}
          sub="equity holdings"
          accent="#00E5FF"
        />
        <KPIItem
          label="Total P&L"
          value={
            <span style={{ color: totalPnL >= 0 ? "#00ff9f" : "#ff4d6d" }}>
              {totalPnL >= 0 ? "+" : ""}
              {fmtINR(totalPnL)}
            </span>
          }
          sub={fmtPct(avgReturn, true)}
          accent={totalPnL >= 0 ? "#00ff9f" : "#ff4d6d"}
        />
        <KPIItem
          label="Today Change"
          value={<span className="text-white/40 text-base">—</span>}
          sub="Data unavailable"
          accent="#4F8CFF"
        />
        <KPIItem
          label="Portfolio Score"
          value={
            <span style={{ color: portfolioScore.color }}>
              {portfolioScore.grade}
              <span className="text-sm font-normal text-white/40 ml-2">
                {portfolioScore.label}
              </span>
            </span>
          }
          accent={portfolioScore.color}
        />
        <KPIItem
          label="Risk Level"
          value={<span style={{ color: overallRisk.color }}>{overallRisk.label}</span>}
          sub={`${stocks.length} position${stocks.length !== 1 ? "s" : ""}`}
          accent={overallRisk.color}
        />
      </div>

      {/* Performance Chart */}
      <StocksChart totalValue={totalValue} gainPercent={avgReturn} />

      {/* Toolbar: filters + add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200"
              style={
                filterMode === f.id
                  ? {
                      background: "rgba(0,229,255,0.12)",
                      color: "#00E5FF",
                      border: "1px solid rgba(0,229,255,0.25)",
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.4)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl neon-btn"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Stock
        </button>
      </div>

      {/* Holdings Intelligence Table */}
      <div
        className="overflow-x-auto glass-card rounded-2xl"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <SortTh label="Stock" sk="name" />
              <StaticTh label="Qty" />
              <StaticTh label="Avg Price" />
              <StaticTh label="Curr. Price" />
              <SortTh label="P&L" sk="pnl" />
              <SortTh label="Return %" sk="returnPct" />
              <SortTh label="⭐ Confidence" sk="confidence" />
              <SortTh label="⚠ Risk" sk="risk" />
              <StaticTh label="💡 Action" />
              <StaticTh label="" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ asset: a, returnPct, pnl, confidence, risk, action }) => {
              const isDeleting = deletingId === a.id;
              const entryHint =
                action.label === "BUY"
                  ? "Momentum positive"
                  : action.label === "REDUCE"
                  ? "Below cost basis"
                  : "Monitoring";

              return (
                <tr
                  key={a.id}
                  className="neon-table-row cursor-pointer"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onClick={() => setSelectedStock(a)}
                >
                  {/* Stock name + symbol */}
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-white font-semibold font-mono">
                        {a.symbol ?? a.name}
                      </p>
                      <p className="text-xs text-white/35 mt-0.5 max-w-[120px] truncate">
                        {a.name}
                      </p>
                    </div>
                  </td>
                  {/* Qty */}
                  <td className="px-4 py-3.5 text-white/60 tabular-nums">
                    {(a.quantity ?? 0).toLocaleString("en-IN")}
                  </td>
                  {/* Avg Price */}
                  <td className="px-4 py-3.5 text-white/60 tabular-nums whitespace-nowrap">
                    {fmtINR(a.avgPrice)}
                  </td>
                  {/* Current Price */}
                  <td className="px-4 py-3.5 text-white font-medium tabular-nums whitespace-nowrap">
                    {a.currentPrice ? (
                      fmtINR(a.currentPrice)
                    ) : (
                      <span className="text-white/25">—</span>
                    )}
                  </td>
                  {/* P&L */}
                  <td
                    className="px-4 py-3.5 tabular-nums whitespace-nowrap font-semibold"
                    style={{ color: pnl >= 0 ? "#00ff9f" : "#ff4d6d" }}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {fmtINR(pnl)}
                  </td>
                  {/* Return % */}
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background:
                          returnPct >= 0
                            ? "rgba(0,255,159,0.08)"
                            : "rgba(255,77,109,0.08)",
                        color: returnPct >= 0 ? "#00ff9f" : "#ff4d6d",
                        border: `1px solid ${
                          returnPct >= 0
                            ? "rgba(0,255,159,0.2)"
                            : "rgba(255,77,109,0.2)"
                        }`,
                      }}
                    >
                      {returnPct >= 0 ? "▲" : "▼"} {Math.abs(returnPct).toFixed(1)}%
                    </span>
                  </td>
                  {/* Confidence Score */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${confidence.score * 10}%`,
                            background: confidence.color,
                            boxShadow: `0 0 6px ${confidence.color}55`,
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: confidence.color }}
                      >
                        {confidence.label}
                      </span>
                    </div>
                  </td>
                  {/* Risk */}
                  <td className="px-4 py-3.5">
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: risk.bg,
                        color: risk.color,
                        border: `1px solid ${risk.border}`,
                      }}
                    >
                      {risk.label}
                    </span>
                  </td>
                  {/* Action */}
                  <td className="px-4 py-3.5">
                    <div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{
                          background: action.bg,
                          color: action.color,
                          border: `1px solid ${action.border}`,
                        }}
                      >
                        {action.label}
                      </span>
                      <p className="text-xs text-white/25 mt-0.5">{entryHint}</p>
                    </div>
                  </td>
                  {/* Edit / Delete */}
                  <td
                    className="px-4 py-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditing(a);
                          setModalOpen(true);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                        style={{
                          background: "rgba(0,229,255,0.07)",
                          color: "rgba(0,229,255,0.6)",
                          border: "1px solid rgba(0,229,255,0.15)",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={isDeleting}
                        className="text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                        style={{
                          background: "rgba(255,77,109,0.07)",
                          color: "rgba(255,77,109,0.6)",
                          border: "1px solid rgba(255,77,109,0.15)",
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

        {sorted.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-white/30">No stocks match the current filter.</p>
          </div>
        )}
      </div>

      {/* Stock Detail Panel */}
      {selectedStock && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            style={{ backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedStock(null)}
          />
          <StockDetailPanel
            stock={selectedStock}
            onClose={() => setSelectedStock(null)}
          />
        </>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        isCommodityAsset(editing) ? (
          <CommodityModal
            asset={editing}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        ) : (
          <StockModal
            asset={editing}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        )
      )}
    </div>
  );
}
