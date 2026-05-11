"use client";

import { useState, useEffect } from "react";
import type { StockQuote, Client } from "@/lib/api";
import { createAsset, saveRecommendedStock } from "@/lib/api";
import { getClients } from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";

// ── Currency helpers (mirrored from StockSearch) ──────────────────────────────

const USD_TO_INR = 83;

function getCurrency(symbol: string): "INR" | "USD" {
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) return "INR";
  return "USD";
}

function normalizePrice(price: number | null | undefined, currency: "INR" | "USD"): number {
  if (price == null) return 0;
  return currency === "USD" ? price * USD_TO_INR : price;
}

function formatPrice(price: number | null | undefined, currency: "INR" | "USD"): string {
  if (price == null) return "--";
  const v = normalizePrice(price, currency);
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatMarketCap(value: number | null | undefined, currency: "INR" | "USD"): string {
  if (value == null || value === 0) return "--";
  const v = normalizePrice(value, currency);
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function defaultAvgPrice(stock: StockQuote): string {
  if (!stock.price) return "";
  const normalized = normalizePrice(stock.price, getCurrency(stock.symbol));
  // Round to 2 decimal places
  return String(Math.round(normalized * 100) / 100);
}

function fmtFundamental(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "--";
  return value.toFixed(decimals);
}

// ── AI Score derivation ───────────────────────────────────────────────────────

interface AIScore {
  score: number;
  label: string;
  color: string;
  bg: string;
  border: string;
  recommendation: "BUY" | "HOLD" | "REDUCE";
  recText: string;
  recColor: string;
}

// ── AI scoring thresholds ─────────────────────────────────────────────────────

// Momentum: day-change % thresholds that adjust the base score
const MOMENTUM_STRONG_UP = 5;   // +2 score: strong positive day
const MOMENTUM_WEAK_UP = 2;     // +1 score: mild positive day
const MOMENTUM_WEAK_DOWN = -2;  // -1 score: mild negative day
const MOMENTUM_STRONG_DOWN = -5; // -2 score: strong negative day

// Valuation: PE ratio brackets (lower PE = better value for Indian equities)
const PE_VALUE_MAX = 15;        // PE < 15 → +2 (deep value)
const PE_FAIR_MAX = 30;         // 15 ≤ PE < 30 → +1 (fair value)
const PE_EXPENSIVE_MIN = 50;    // PE ≥ 50 → -1 (expensive / speculative)

// Profitability: ROE/ROCE thresholds (higher = better capital efficiency)
const PROFITABILITY_HIGH = 20;  // > 20% → +1 (strong returns on equity/capital)
const ROE_LOW = 5;              // ROE < 5% → -1 (weak equity returns)
const ROCE_LOW = 8;             // ROCE < 8% → -1 (poor capital utilisation)

// Recommendation cutoffs on the 1–10 scale
const SCORE_BUY_MIN = 7;   // ≥ 7 → BUY
const SCORE_HOLD_MIN = 4;  // 4–6 → HOLD; < 4 → REDUCE

// Delay (ms) before closing the "Add to client" sub-form after a successful add
const SUCCESS_CLOSE_DELAY_MS = 1200;

function computeAIScore(stock: StockQuote): AIScore {
  let score = 5; // baseline

  // Price momentum
  const cp = stock.changePercent ?? 0;
  if (cp > MOMENTUM_STRONG_UP) score += 2;
  else if (cp > MOMENTUM_WEAK_UP) score += 1;
  else if (cp < MOMENTUM_STRONG_DOWN) score -= 2;
  else if (cp < MOMENTUM_WEAK_DOWN) score -= 1;

  // Valuation (PE) — lower is better for value; very high PE is a risk
  if (stock.pe != null) {
    if (stock.pe > 0 && stock.pe < PE_VALUE_MAX) score += 2;
    else if (stock.pe >= PE_VALUE_MAX && stock.pe < PE_FAIR_MAX) score += 1;
    else if (stock.pe >= PE_EXPENSIVE_MIN) score -= 1;
  }

  // Profitability (ROE) — higher return on equity is better
  if (stock.roe != null) {
    if (stock.roe > PROFITABILITY_HIGH) score += 1;
    else if (stock.roe < ROE_LOW) score -= 1;
  }

  // Capital efficiency (ROCE) — higher return on capital employed is better
  if (stock.roce != null) {
    if (stock.roce > PROFITABILITY_HIGH) score += 1;
    else if (stock.roce < ROCE_LOW) score -= 1;
  }

  score = Math.max(1, Math.min(10, score));

  const recommendation: "BUY" | "HOLD" | "REDUCE" =
    score >= SCORE_BUY_MIN ? "BUY" : score >= SCORE_HOLD_MIN ? "HOLD" : "REDUCE";

  const recMap = {
    BUY: {
      text: "Strong fundamentals and positive momentum. Consider adding to portfolio.",
      color: "#00ff9f",
    },
    HOLD: {
      text: "Stable performance. Monitor for improved entry or exit opportunities.",
      color: "#00E5FF",
    },
    REDUCE: {
      text: "Weak signals detected. Review exposure and consider reducing position.",
      color: "#ff4d6d",
    },
  } as const;

  const scoreColorMap: { min: number; color: string; bg: string; border: string }[] = [
    { min: 9, color: "#00ff9f",  bg: "rgba(0,255,159,0.08)",   border: "rgba(0,255,159,0.25)"  },
    { min: 7, color: "#00E5FF",  bg: "rgba(0,229,255,0.08)",   border: "rgba(0,229,255,0.25)"  },
    { min: 5, color: "#4F8CFF",  bg: "rgba(79,140,255,0.08)",  border: "rgba(79,140,255,0.25)" },
    { min: 3, color: "#fbbf24",  bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)" },
    { min: 0, color: "#ff4d6d",  bg: "rgba(255,77,109,0.08)",  border: "rgba(255,77,109,0.25)" },
  ];

  const colors = scoreColorMap.find((c) => score >= c.min) ?? scoreColorMap[scoreColorMap.length - 1];

  return {
    score,
    label: `${score}/10`,
    color: colors.color,
    bg: colors.bg,
    border: colors.border,
    recommendation,
    recText: recMap[recommendation].text,
    recColor: recMap[recommendation].color,
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: "rgba(255,255,255,0.08)" }}
    />
  );
}

function StockDetailSkeleton() {
  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-3.5 w-1/4" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="h-6 w-24 ml-auto" />
          <Skeleton className="h-3.5 w-16 ml-auto" />
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-3 space-y-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-4.5 w-3/5" />
          </div>
        ))}
      </div>

      {/* AI badge */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
      <div className="space-y-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    </div>
  );
}

// ── Metric cell ───────────────────────────────────────────────────────────────

function MetricCell({ label, value }: { label: string; value: string }) {
  const missing = value === "--";
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <p className="text-xs mb-1" style={{ color: "rgba(201,162,39,0.6)" }}>
        {label}
      </p>
      <p
        className="text-sm font-semibold"
        style={{ color: missing ? "rgba(255,255,255,0.3)" : "white" }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      style={{ color: "#c9a227" }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Add-to-client inline form ─────────────────────────────────────────────────

interface AddToClientFormProps {
  stock: StockQuote;
  onDone: () => void;
}

function AddToClientForm({ stock, onDone }: AddToClientFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState(defaultAvgPrice(stock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setClientsLoading(true);
    getClients()
      .then((data) => {
        if (!cancelled) setClients(data);
      })
      .catch(() => {
        if (!cancelled) setClients([]);
      })
      .finally(() => {
        if (!cancelled) setClientsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleAdd() {
    if (!selectedClientId) { setError("Please select a client"); return; }
    const qty = Number(quantity);
    const price = Number(avgPrice);
    if (!Number.isFinite(qty) || qty <= 0) { setError("Quantity must be a positive number"); return; }
    if (!Number.isFinite(price) || price <= 0) { setError("Price must be a positive amount"); return; }

    setError(null);
    setSaving(true);
    try {
      await createAsset({
        type: "stock",
        symbol: stock.symbol,
        name: stock.name,
        quantity: qty,
        avgPrice: price,
        userId: selectedClientId as number,
      });
      setSuccess(true);
      setTimeout(onDone, SUCCESS_CLOSE_DELAY_MS);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm" style={{ color: "#00ff9f" }}>
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
        Added to client portfolio
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Client picker */}
      <div>
        <label className="block text-xs mb-1.5" style={{ color: "rgba(201,162,39,0.7)" }}>
          Client
        </label>
        {clientsLoading ? (
          <div className="flex items-center gap-2 text-xs py-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Spinner /> Loading clients…
          </div>
        ) : (
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(201,162,39,0.2)",
              color: selectedClientId === "" ? "rgba(255,255,255,0.35)" : "white",
            }}
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Quantity + Price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: "rgba(201,162,39,0.7)" }}>
            Quantity
          </label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 10"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 text-sm text-white placeholder-white/25 rounded-xl focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(201,162,39,0.2)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: "rgba(201,162,39,0.7)" }}>
            Avg Price (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter average buy price"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            className="w-full px-3 py-2 text-sm text-white placeholder-white/25 rounded-xl focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(201,162,39,0.2)",
            }}
          />
        </div>
      </div>

      {error && (
        <p
          className="text-xs rounded-lg px-3 py-2"
          style={{ color: "#ff4d6d", background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)" }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition"
          style={{
            background: saving ? "rgba(201,162,39,0.08)" : "rgba(201,162,39,0.15)",
            border: "1px solid rgba(201,162,39,0.3)",
            color: "#d4af4a",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving && <Spinner />}
          {saving ? "Adding…" : "Confirm Add"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm rounded-xl transition"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface StockDetailPanelProps {
  /** The selected stock. `null` hides the panel, `undefined` shows the panel in loading skeleton state. */
  stock: StockQuote | null | undefined;
  /** Explicit loading override — shows skeleton even if stock is set (e.g. while re-fetching). */
  loading?: boolean;
  /** Called when the user closes the panel. */
  onClose: () => void;
}

export default function StockDetailPanel({ stock, loading = false, onClose }: StockDetailPanelProps) {
  const [addingToClient, setAddingToClient] = useState(false);
  const [saveRecLoading, setSaveRecLoading] = useState(false);
  const [saveRecSuccess, setSaveRecSuccess] = useState(false);
  const [saveRecError, setSaveRecError] = useState<string | null>(null);

  // Reset action states when stock changes
  useEffect(() => {
    setAddingToClient(false);
    setSaveRecLoading(false);
    setSaveRecSuccess(false);
    setSaveRecError(null);
  }, [stock?.symbol]);

  if (stock === null) return null;

  const isLoading = loading || stock === undefined;
  const currency = stock ? getCurrency(stock.symbol) : "INR";
  const aiScore = stock ? computeAIScore(stock) : null;

  async function handleSaveRecommended() {
    if (!stock) return;
    setSaveRecError(null);
    setSaveRecLoading(true);
    try {
      await saveRecommendedStock({ symbol: stock.symbol, name: stock.name, price: stock.price });
      setSaveRecSuccess(true);
    } catch (err) {
      setSaveRecError(toErrorMessage(err));
    } finally {
      setSaveRecLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(8,48,36,0.65)",
        border: "1px solid rgba(201,162,39,0.18)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      {/* ── Panel header ── */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.25)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-4 4 4 4-4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Stock Details</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          aria-label="Close stock detail panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <StockDetailSkeleton />
      ) : (
        <div className="p-5 space-y-5">
          {/* ── TOP: Name + Symbol + Price ── */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white leading-tight truncate">
                {stock.name}
              </h3>
              <span
                className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(201,162,39,0.12)",
                  border: "1px solid rgba(201,162,39,0.22)",
                  color: "#d4af4a",
                }}
              >
                {stock.symbol}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-white">
                {formatPrice(stock.price, currency)}
              </p>
              <p
                className="text-sm font-semibold mt-0.5"
                style={{
                  color: (stock.changePercent ?? 0) >= 0 ? "#00ff9f" : "#ff4d6d",
                }}
              >
                {(stock.changePercent ?? 0) >= 0 ? "+" : ""}
                {(stock.changePercent ?? 0).toFixed(2)}%
                <span className="ml-1 text-xs font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>
                  ({(stock.change ?? 0) >= 0 ? "+" : ""}
                  {formatPrice(stock.change, currency)})
                </span>
              </p>
            </div>
          </div>

          {/* ── MIDDLE: Fundamentals grid ── */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1.25rem" }}>
            <p className="text-xs font-medium mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              FUNDAMENTALS
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <MetricCell label="P/E Ratio" value={fmtFundamental(stock.pe, 1)} />
              <MetricCell label="ROE" value={stock.roe != null ? `${fmtFundamental(stock.roe, 1)}%` : "--"} />
              <MetricCell label="ROCE" value={stock.roce != null ? `${fmtFundamental(stock.roce, 1)}%` : "--"} />
              <MetricCell label="Book Value" value={stock.bookValue != null ? formatPrice(stock.bookValue, currency) : "--"} />
              <div className="col-span-2">
                <MetricCell label="Market Cap" value={formatMarketCap(stock.marketCap, currency)} />
              </div>
            </div>
          </div>

          {/* ── BOTTOM: AI Score + Recommendation ── */}
          {aiScore && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1.25rem" }}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold"
                  style={{
                    background: aiScore.bg,
                    border: `1px solid ${aiScore.border}`,
                    color: aiScore.color,
                  }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09z" />
                  </svg>
                  AI Score {aiScore.label}
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background:
                      aiScore.recommendation === "BUY"
                        ? "rgba(0,255,159,0.1)"
                        : aiScore.recommendation === "HOLD"
                        ? "rgba(0,229,255,0.1)"
                        : "rgba(255,77,109,0.1)",
                    border:
                      aiScore.recommendation === "BUY"
                        ? "1px solid rgba(0,255,159,0.25)"
                        : aiScore.recommendation === "HOLD"
                        ? "1px solid rgba(0,229,255,0.25)"
                        : "1px solid rgba(255,77,109,0.25)",
                    color: aiScore.recColor,
                  }}
                >
                  {aiScore.recommendation}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {aiScore.recText}
              </p>
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1.25rem" }}>
            {addingToClient ? (
              <AddToClientForm stock={stock} onDone={() => setAddingToClient(false)} />
            ) : (
              <div className="space-y-2.5">
                {/* Add to client */}
                <button
                  type="button"
                  onClick={() => setAddingToClient(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition"
                  style={{
                    background: "rgba(201,162,39,0.12)",
                    border: "1px solid rgba(201,162,39,0.25)",
                    color: "#d4af4a",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,162,39,0.2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,162,39,0.12)"; }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                  Add to Client Portfolio
                </button>

                {/* Save as recommended */}
                <button
                  type="button"
                  onClick={handleSaveRecommended}
                  disabled={saveRecLoading || saveRecSuccess}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition"
                  style={{
                    background: saveRecSuccess
                      ? "rgba(0,255,159,0.08)"
                      : "rgba(255,255,255,0.05)",
                    border: saveRecSuccess
                      ? "1px solid rgba(0,255,159,0.2)"
                      : "1px solid rgba(255,255,255,0.1)",
                    color: saveRecSuccess
                      ? "#00ff9f"
                      : saveRecLoading
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(255,255,255,0.65)",
                    opacity: saveRecLoading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!saveRecLoading && !saveRecSuccess) {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saveRecLoading && !saveRecSuccess) {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                >
                  {saveRecLoading ? (
                    <Spinner />
                  ) : saveRecSuccess ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5z" />
                    </svg>
                  )}
                  {saveRecLoading ? "Saving…" : saveRecSuccess ? "Saved as Recommended" : "Save as Recommended Stock"}
                </button>

                {saveRecError && (
                  <p
                    className="text-xs rounded-lg px-3 py-2 text-center"
                    style={{ color: "#ff4d6d", background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)" }}
                  >
                    {saveRecError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
