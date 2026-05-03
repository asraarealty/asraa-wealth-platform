"use client";

import type { Asset } from "@/lib/api";

interface Props {
  assets: Asset[];
}

interface Rec {
  id: string;
  label: string;
  color: string;
  icon: React.ReactNode;
}

/** Allocation thresholds that drive portfolio recommendations */
const MAX_EQUITY_ALLOCATION_PCT = 60;
const MIN_MF_ALLOCATION_PCT = 20;
const MIN_RE_ALLOCATION_PCT = 10;

function buildRecs(assets: Asset[]): Rec[] {
  if (assets.length === 0) return [];

  const recs: Rec[] = [];
  const total = assets.reduce((s, a) => s + (a.value ?? a.currentValue ?? 0), 0);
  if (total === 0) return [];

  const stockVal = assets
    .filter((a) => a.type === "stock")
    .reduce((s, a) => s + (a.value ?? 0), 0);
  const mfVal = assets
    .filter((a) => a.type === "mf")
    .reduce((s, a) => s + (a.value ?? 0), 0);
  const reVal = assets
    .filter((a) => a.type === "property")
    .reduce((s, a) => s + (a.currentValue ?? 0), 0);

  const stockPct = (stockVal / total) * 100;
  const mfPct = (mfVal / total) * 100;
  const rePct = (reVal / total) * 100;

  if (stockPct > MAX_EQUITY_ALLOCATION_PCT)
    recs.push({
      id: "reduce-equity",
      label: "Reduce equity exposure — portfolio is overweight stocks",
      color: "text-red-400",
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
        </svg>
      ),
    });

  if (mfPct < MIN_MF_ALLOCATION_PCT)
    recs.push({
      id: "add-mf",
      label: "Add mutual funds for diversification and lower volatility",
      color: "text-emerald-400",
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    });

  if (rePct < MIN_RE_ALLOCATION_PCT)
    recs.push({
      id: "invest-re",
      label: "Consider real estate for stable income and inflation hedge",
      color: "text-sky-400",
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    });

  if (recs.length === 0)
    recs.push({
      id: "hold",
      label: "Portfolio is well balanced across asset classes — Hold",
      color: "text-emerald-400",
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      ),
    });

  return recs;
}

export default function ClientRecommendations({ assets }: Props) {
  const recs = buildRecs(assets);

  return (
    <div className="glass-card card-hover rounded-2xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "rgba(201,162,39,0.15)",
            border: "1px solid rgba(201,162,39,0.25)",
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Recommendations</p>
          <p className="text-xs text-gray-400">Smart portfolio action items</p>
        </div>
      </div>

      {recs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          Add assets to get personalized recommendations.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {recs.map((rec) => (
            <li
              key={rec.id}
              className="flex items-start gap-2.5 rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className={`mt-0.5 ${rec.color}`}>{rec.icon}</span>
              <p className={`text-sm leading-snug ${rec.color}`}>{rec.label}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
