"use client";

import { useState, useEffect, useCallback } from "react";
import { fetcher } from "@/lib/fetcher";
import { toErrorMessage } from "@/lib/fetcher";
import {
  mapPortfolio,
  type PortfolioData,
  type RawPortfolioResponse,
} from "@/lib/mappers/mapPortfolio";
import {
  mapInsights,
  type InsightsData,
  type RawInsightsResponse,
} from "@/lib/mappers/mapInsights";
import KPISection from "./KPISection";
import InsightsPanel from "./InsightsPanel";
import HoldingsTable from "./HoldingsTable";
import AllocationSection from "./AllocationSection";
import AddAssetModal from "./modals/AddAssetModal";
import Loader from "@/components/ui/Loader";
import type { CreateAssetPayload } from "@/lib/api";
import { createAsset } from "@/lib/api";

// ── Section wrapper ─────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function Section({ title, children, action }: SectionProps) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-light">
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyPortfolio({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="glass-card rounded-2xl p-12 text-center animate-fade-in"
      style={{ border: "1px solid rgba(201,162,39,0.15)" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.2)" }}
      >
        <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
        </svg>
      </div>
      <p className="text-white font-semibold mb-1">No holdings yet</p>
      <p className="text-sm text-gray-400 mb-5">
        Add your first investment to start tracking your portfolio.
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors"
        style={{ background: "#c9a227", color: "#071a14" }}
      >
        + Add Asset
      </button>
    </div>
  );
}

// ── Error banner ────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
    >
      <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p className="text-sm text-red-300 flex-1">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ── Sync button with spinner ────────────────────────────────────────────────

function SyncButton({ syncing, onClick }: { syncing: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={syncing}
      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-60"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.75)",
      }}
    >
      <svg
        className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      {syncing ? "Syncing…" : "Sync Portfolio"}
    </button>
  );
}

// ── Main Dashboard component ────────────────────────────────────────────────

interface DashboardProps {
  /** Optional: pass a pre-fetched client id (admin view) */
  clientId?: number;
}

export default function PortfolioDashboard({ clientId }: DashboardProps) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const portfolioPath = clientId !== undefined
    ? `/portfolio?user_id=${encodeURIComponent(clientId)}`
    : "/portfolio/me";

  const insightsPath = clientId !== undefined
    ? `/insights?user_id=${encodeURIComponent(clientId)}`
    : "/insights/me";

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [rawPortfolio, rawInsights] = await Promise.all([
          fetcher<RawPortfolioResponse>(portfolioPath, { raw: true }),
          fetcher<RawInsightsResponse>(insightsPath, { raw: true }).catch(
            () => null
          ),
        ]);

        // The /portfolio/me endpoint may return just a positions array or
        // the full envelope. Normalise to the envelope shape, computing
        // aggregate totals from positions when the backend omits them so that
        // KPI values are always correct rather than showing zeros.
        let portfolioEnvelope: RawPortfolioResponse;
        if (Array.isArray(rawPortfolio)) {
          const positions = (rawPortfolio as RawPortfolioResponse["positions"]) ?? [];
          const totalValue = positions.reduce((s, p) => s + (p.value ?? 0), 0);
          const stockValue = positions
            .filter((p) => p.type === "stock")
            .reduce((s, p) => s + (p.value ?? 0), 0);
          const mfValue = positions
            .filter((p) => p.type === "mf")
            .reduce((s, p) => s + (p.value ?? 0), 0);
          const propertyValue = positions
            .filter((p) => p.type === "property")
            .reduce((s, p) => s + (p.value ?? 0), 0);
          const totalInvested = positions.reduce(
            (s, p) => s + (p.avg_price ?? 0) * (p.quantity ?? 0),
            0
          );
          const roiPercent =
            totalInvested > 0
              ? ((totalValue - totalInvested) / totalInvested) * 100
              : 0;
          portfolioEnvelope = {
            positions,
            total_value: totalValue,
            stock_value: stockValue,
            mf_value: mfValue,
            property_value: propertyValue,
            roi_percent: roiPercent,
          };
        } else {
          portfolioEnvelope = rawPortfolio ?? {
            positions: [],
            total_value: 0,
            stock_value: 0,
            mf_value: 0,
            property_value: 0,
            roi_percent: 0,
          };
        }

        setPortfolio(mapPortfolio(portfolioEnvelope));

        if (rawInsights) {
          setInsights(mapInsights(rawInsights));
        }
      } catch (err) {
        if (!silent) setError(toErrorMessage(err));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [portfolioPath, insightsPath]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSync() {
    setSyncing(true);
    try {
      await loadData(true);
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd(payload: CreateAssetPayload) {
    await createAsset({
      ...payload,
      ...(clientId !== undefined ? { user_id: clientId } : {}),
    });
    await loadData(true);
    setAddModalOpen(false);
  }

  // ── Render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#071a14] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  const hasPositions =
    (portfolio?.positions?.length ?? 0) > 0;

  return (
    <div className="min-h-screen text-white bg-[#071a14] p-6 space-y-6 animate-fade-in">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Real-time overview of your wealth portfolio
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SyncButton syncing={syncing} onClick={handleSync} />
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
            style={{ background: "#c9a227", color: "#071a14" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Asset
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <ErrorBanner message={error} onRetry={() => loadData()} />
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!error && !hasPositions && (
        <EmptyPortfolio onAdd={() => setAddModalOpen(true)} />
      )}

      {/* ── Main content ───────────────────────────────────────────── */}
      {!error && hasPositions && portfolio && (
        <>
          {/* KPI Section */}
          <Section title="Performance Overview">
            <KPISection portfolio={portfolio} />
          </Section>

          {/* Insights + Allocation side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Allocation */}
            <Section title="Asset Allocation">
              <AllocationSection portfolio={portfolio} />
            </Section>

            {/* Insights */}
            {insights ? (
              <InsightsPanel insights={insights} />
            ) : (
              <div className="glass-card rounded-2xl p-5 flex items-center justify-center">
                <p className="text-sm text-gray-500">Insights unavailable.</p>
              </div>
            )}
          </div>

          {/* Holdings Table */}
          <Section
            title={`Holdings · ${portfolio.positions.length} position${portfolio.positions.length !== 1 ? "s" : ""}`}
          >
            <HoldingsTable positions={portfolio.positions} />
          </Section>
        </>
      )}

      {/* ── Add Asset modal ─────────────────────────────────────────── */}
      {addModalOpen && (
        <AddAssetModal
          onClose={() => setAddModalOpen(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  );
}
