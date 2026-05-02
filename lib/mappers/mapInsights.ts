// ── Raw API types (snake_case — never leak into UI) ────────────────────────

export interface RawInsightAsset {
  id: number;
  name: string;
  type: string;
  symbol: string;
  total_value: number;
  return_percentage: number;
}

export interface RawInsightsResponse {
  total_portfolio_value: number;
  equity_percentage: number;
  real_estate_percentage: number;
  alerts: string[];
  assets: RawInsightAsset[];
}

// ── Mapped types (camelCase — safe for UI consumption) ──────────────────────

export type AlertSeverity = "warning" | "critical";

export interface Alert {
  text: string;
  severity: AlertSeverity;
}

export interface InsightAsset {
  id: number;
  name: string;
  type: string;
  symbol: string;
  totalValue: number;
  returnPercentage: number;
}

export interface InsightsData {
  totalPortfolioValue: number;
  equityPercentage: number;
  realEstatePercentage: number;
  alerts: Alert[];
  assets: InsightAsset[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const CRITICAL_KEYWORDS = [
  "critical",
  "loss",
  "overexposed",
  "delayed",
  "breach",
  "alert",
  "danger",
  "risk",
];

function classifyAlert(text: string): AlertSeverity {
  const lower = text.toLowerCase();
  return CRITICAL_KEYWORDS.some((kw) => lower.includes(kw))
    ? "critical"
    : "warning";
}

// ── Mapper functions ────────────────────────────────────────────────────────

function mapInsightAsset(raw: RawInsightAsset): InsightAsset {
  return {
    id: raw.id,
    name: raw.name ?? "",
    type: raw.type ?? "",
    symbol: raw.symbol ?? "",
    totalValue: raw.total_value ?? 0,
    returnPercentage: raw.return_percentage ?? 0,
  };
}

export function mapInsights(raw: RawInsightsResponse): InsightsData {
  const rawAlerts = Array.isArray(raw.alerts) ? raw.alerts : [];

  return {
    totalPortfolioValue: raw.total_portfolio_value ?? 0,
    equityPercentage: raw.equity_percentage ?? 0,
    realEstatePercentage: raw.real_estate_percentage ?? 0,
    alerts: rawAlerts.map((text) => ({
      text: String(text),
      severity: classifyAlert(String(text)),
    })),
    assets: Array.isArray(raw.assets)
      ? raw.assets.map(mapInsightAsset)
      : [],
  };
}
