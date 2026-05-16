"use client";

import type { InsightsData, AlertSeverity } from "@/lib/mappers/mapInsights";

interface InsightsPanelProps {
  insights: InsightsData;
}

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { container: string; badge: string; icon: React.ReactNode }
> = {
  warning: {
    container: "bg-amber-500/5 border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  critical: {
    container: "bg-red-500/5 border-red-500/20",
    badge: "bg-red-500/10 text-red-400 border-red-500/25",
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm9-6.75A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
};

interface AllocationBarProps {
  label: string;
  percent: number;
  color: string;
}

function AllocationBar({ label, percent, color }: AllocationBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(percent, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  const {
    equityPercentage,
    realEstatePercentage,
    alerts,
  } = insights;

  const debtPercentage = Math.max(
    0,
    100 - equityPercentage - realEstatePercentage
  );

  return (
    <div className="glass-card card-hover rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "rgba(56,189,248,0.15)",
            border: "1px solid rgba(56,189,248,0.25)",
          }}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#38bdf8"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Insights</p>
          <p className="text-xs text-gray-400">Allocation &amp; Alerts</p>
        </div>
      </div>

      {/* Allocation percentages */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-light mb-3">
          Portfolio Allocation
        </p>
        <AllocationBar label="Equity" percent={equityPercentage} color="#38bdf8" />
        <AllocationBar label="Real Estate" percent={realEstatePercentage} color="#3498db" />
        <AllocationBar label="Debt / Other" percent={debtPercentage} color="#9b59b6" />
      </div>

      {/* Alerts */}
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No active alerts. Portfolio looks healthy.
        </p>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-light">
            Active Alerts
          </p>
          <ul className="space-y-2">
            {alerts.map((alert, i) => {
              const style = SEVERITY_STYLES[alert.severity];
              return (
                <li
                  key={i}
                  className={`rounded-xl p-3 border ${style.container}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border font-medium ${style.badge}`}>
                      {style.icon}
                      {alert.severity === "critical" ? "Critical" : "Warning"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    {alert.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
