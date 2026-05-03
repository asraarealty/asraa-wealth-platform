"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/fetcher";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import ClientIntelligenceTable from "@/components/admin/dashboard/ClientIntelligenceTable";
import RecommendationCard from "@/components/admin/dashboard/RecommendationCard";
import AlertsPanel from "@/components/admin/dashboard/AlertsPanel";
import {
  type ClientIntelligence,
  deriveAlerts,
  calcAverageReturn,
} from "@/components/admin/dashboard/intelligenceHelpers";

export default function InsightsPage() {
  const [rows, setRows] = useState<ClientIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    fetch("/api/portfolio/intelligence", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load intelligence data (${res.status})`);
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load insights");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

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
      </div>

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
