"use client";

import type { InsightsResponse } from "@/lib/api";

interface Insight {
  id: string;
  type: "opportunity" | "risk" | "rebalance" | "trend";
  title: string;
  body: string;
}

const TYPE_STYLES: Record<
  Insight["type"],
  { badge: string; icon: React.ReactNode }
> = {
  opportunity: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  trend: {
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  risk: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  rebalance: {
    badge: "bg-gold/10 text-gold-light border-gold/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
};

function classifyInsight(text: string): Insight["type"] {
  const t = text.toLowerCase();
  if (t.includes("opportunit") || t.includes("growth") || t.includes("gain")) return "opportunity";
  if (t.includes("risk") || t.includes("overexposed") || t.includes("loss") || t.includes("delayed")) return "risk";
  if (t.includes("rebalanc") || t.includes("adjust") || t.includes("consider")) return "rebalance";
  return "trend";
}

function alertsToInsights(
  insights: InsightsResponse | null,
  equityPct: number,
  rePct: number
): Insight[] {
  const result: Insight[] = [];

  if (insights && insights.alerts && insights.alerts.length > 0) {
    insights.alerts.slice(0, 5).forEach((alert, i) => {
      if (typeof alert === "string") {
        // Plain-text alert from backend
        const type = classifyInsight(alert);
        result.push({
          id: `alert-${i}`,
          type,
          title: alert.length > 55 ? alert.slice(0, 55) + "…" : alert,
          body: alert,
        });
      } else {
        // Structured InsightItem from backend
        result.push({
          id: String(alert.id ?? `alert-${i}`),
          type: alert.type,
          title: alert.title,
          body: alert.body,
        });
      }
    });
  }

  // Append allocation-based insights if we have room
  if (result.length < 3) {
    if (equityPct > 65) {
      result.push({
        id: "equity-overweight",
        type: "risk",
        title: "High equity concentration",
        body: `Portfolio is ${equityPct.toFixed(0)}% in equities. Consider diversifying into debt or real estate for stability.`,
      });
    }
    if (rePct < 10 && result.length < 4) {
      result.push({
        id: "re-underweight",
        type: "rebalance",
        title: "Low real-estate allocation",
        body: "Adding real estate can provide inflation hedging and steady rental income to balance the portfolio.",
      });
    }
    if (equityPct <= 65 && rePct >= 10 && result.length === 0) {
      result.push({
        id: "balanced",
        type: "opportunity",
        title: "Portfolio is well-diversified",
        body: "Asset allocation across equities, funds and real estate looks healthy. Continue monitoring for drift.",
      });
    }
  }

  return result;
}

interface AIInsightsPanelProps {
  insights?: InsightsResponse | null;
}

export default function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  const equityPct = insights?.equity_percentage ?? 0;
  const rePct = insights?.real_estate_percentage ?? 0;
  const items = alertsToInsights(insights ?? null, equityPct, rePct);

  return (
    <div className="glass-card card-hover rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-5">
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
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">AI Insights</p>
          <p className="text-xs text-gray-400">Powered by Asraa Intelligence</p>
        </div>
        {insights && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold-light border border-gold/20">
            Live
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          Add assets to unlock portfolio insights.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((insight) => {
            const style = TYPE_STYLES[insight.type];
            return (
              <li
                key={insight.id}
                className="rounded-xl p-3.5 transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${style.badge}`}
                  >
                    {style.icon}
                    {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                  </span>
                </div>
                <p className="text-sm font-medium text-white mt-2">
                  {insight.title}
                </p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {insight.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
