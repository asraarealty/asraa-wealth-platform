"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import ClientIntelligenceTable from "@/components/admin/dashboard/ClientIntelligenceTable";
import RecommendationCard from "@/components/admin/dashboard/RecommendationCard";
import AlertsPanel from "@/components/admin/dashboard/AlertsPanel";
import {
  type ClientIntelligence,
  deriveAlerts,
  calcAverageReturn,
} from "@/components/admin/dashboard/intelligenceHelpers";
import { ApiError, fetcher, toErrorMessage } from "@/lib/fetcher";

export default function InsightsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ClientIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const hasRowsRef = useRef(false);

  useEffect(() => {
    hasRowsRef.current = rows.length > 0;
  }, [rows.length]);

  useEffect(() => {
    const controller = new AbortController();
    const hasExistingRows = hasRowsRef.current;
    if (hasExistingRows) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setRequiresLogin(false);

    fetcher<unknown>("/api/portfolio/intelligence", {
      cache: "no-store",
      noRedirectOn401: true,
      signal: controller.signal,
    })
      .then((data) => {
        const nextRows = Array.isArray(data)
          ? data
          : Array.isArray((data as { data?: unknown[] })?.data)
            ? ((data as { data: unknown[] }).data as ClientIntelligence[])
            : [];
        setRows(nextRows);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 401) {
          if (!hasRowsRef.current) {
            setRows([]);
          }
          setRequiresLogin(true);
          setError("Your session expired while loading intelligence data.");
          return;
        }
        setError(toErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const refresh = () => setReloadKey((k) => k + 1);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (loading && rows.length === 0) return <Loader />;

  const alerts = deriveAlerts(rows);
  const avgReturn = calcAverageReturn(rows);

  const lowRisk = rows.filter((r) => r.riskLevel === "Low").length;
  const medRisk = rows.filter((r) => r.riskLevel === "Medium").length;
  const highRisk = rows.filter((r) => r.riskLevel === "High").length;

  const avgEquity = rows.length > 0
    ? parseFloat((rows.reduce((s, r) => s + r.equityPct, 0) / rows.length).toFixed(1))
    : 0;
  const avgMF = rows.length > 0
    ? parseFloat((rows.reduce((s, r) => s + r.mfPct, 0) / rows.length).toFixed(1))
    : 0;
  const avgRE = rows.length > 0
    ? parseFloat((rows.reduce((s, r) => s + r.realEstatePct, 0) / rows.length).toFixed(1))
    : 0;

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <p className="text-sm text-gray-400 mt-1">
          AI-powered portfolio intelligence across all clients.
        </p>
        {refreshing && (
          <p className="text-xs text-cyan-300 mt-1">Refreshing live intelligence…</p>
        )}
      </div>

      {error && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-sm text-gray-300">{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: "rgba(0,229,255,0.25)",
                color: "#00E5FF",
                background: "rgba(0,229,255,0.08)",
              }}
            >
              Retry
            </button>
            {requiresLogin && (
              <button
                type="button"
                onClick={() => router.replace("/login")}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "rgba(201,162,39,0.25)",
                  color: "#C9A227",
                  background: "rgba(201,162,39,0.08)",
                }}
              >
                Sign in again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alerts */}
      <AlertsPanel alerts={alerts} />

      {/* Risk Distribution */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
          Risk Distribution
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Low Risk", count: lowRisk, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
            { label: "Medium Risk", count: medRisk, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
            { label: "High Risk", count: highRisk, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl p-5 text-center"
              style={{ background: item.bg, border: `1px solid ${item.border}` }}
            >
              <p className="text-3xl font-bold" style={{ color: item.color }}>{item.count}</p>
              <p className="text-xs text-gray-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Allocation + Avg Return overview */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
          Allocation Overview (Average Across Clients)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Avg Return", value: `${avgReturn >= 0 ? "+" : ""}${avgReturn}%`, color: avgReturn >= 0 ? "#10b981" : "#ef4444" },
            { label: "Avg Equity", value: `${avgEquity}%`, color: "#C9A227" },
            { label: "Avg Mutual Funds", value: `${avgMF}%`, color: "#10b981" },
            { label: "Avg Real Estate", value: `${avgRE}%`, color: "#3b82f6" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl p-4 text-center glass-card"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Client Intelligence Table */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
          Client Intelligence
        </p>
        <ClientIntelligenceTable rows={rows} />
      </div>

      {/* Recommendations */}
      {rows.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#c9a227" }}>
            Recommendations
          </p>
          <RecommendationCard rows={rows} />
        </div>
      )}
    </div>
  );
}
