"use client";

import type { ClientIntelligence } from "./intelligenceHelpers";

type Recommendation = {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
};

function buildRecommendations(row: ClientIntelligence): Recommendation[] {
  const recs: Recommendation[] = [];

  if (row.equityPct > 60) {
    recs.push({
      id: "reduce-equity",
      label: "Reduce equity exposure",
      color: "text-red-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
        </svg>
      ),
    });
  }

  if (row.mfPct < 20) {
    recs.push({
      id: "add-mf",
      label: "Add mutual funds",
      color: "text-emerald-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    });
  }

  if (row.realEstatePct < 10) {
    recs.push({
      id: "invest-re",
      label: "Invest in real estate",
      color: "text-sky-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "hold",
      label: "Portfolio is well balanced — Hold",
      color: "text-emerald-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      ),
    });
  }

  return recs;
}

interface Props {
  rows: ClientIntelligence[];
}

export default function RecommendationCard({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="glass-card card-hover rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "rgba(201,162,39,0.15)",
            border: "1px solid rgba(201,162,39,0.25)",
          }}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9a227"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Recommendation Engine</p>
          <p className="text-xs text-gray-400">Per-client action items</p>
        </div>
      </div>

      {/* Client recommendation list */}
      <ul className="space-y-3">
        {rows.map((row) => {
          const recs = buildRecommendations(row);
          return (
            <li
              key={row.clientId}
              className="rounded-xl p-3.5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: "rgba(201,162,39,0.15)",
                    color: "#c9a227",
                    border: "1px solid rgba(201,162,39,0.2)",
                  }}
                >
                  {row.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-white">{row.name}</span>
              </div>
              <ul className="space-y-1.5">
                {recs.map((rec) => (
                  <li key={rec.id} className={`flex items-center gap-2 text-xs ${rec.color}`}>
                    {rec.icon}
                    {rec.label}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
