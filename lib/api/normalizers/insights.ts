import type { InsightsResponse } from "@/lib/api";

function unwrapInsightPayload(value: unknown): Record<string, unknown> {
  const visited = new Set<unknown>();
  let current: unknown = value;
  while (current && typeof current === "object" && !Array.isArray(current) && !visited.has(current)) {
    visited.add(current);
    const record = current as Record<string, unknown>;
    if ("data" in record && record.data && typeof record.data === "object") {
      current = record.data;
      continue;
    }
    if ("insights" in record && record.insights && typeof record.insights === "object") {
      current = record.insights;
      continue;
    }
    if ("intelligence" in record && record.intelligence && typeof record.intelligence === "object") {
      current = record.intelligence;
      continue;
    }
    return record;
  }
  return {};
}

export function normalizeInsights(value: unknown): InsightsResponse | null {
  if (!value || typeof value !== "object") return null;
  const raw = unwrapInsightPayload(value);
  const allocation =
    raw.allocation && typeof raw.allocation === "object" && !Array.isArray(raw.allocation)
      ? (raw.allocation as Record<string, unknown>)
      : {};
  const equity = Number(
    raw.equityPercentage ??
      raw.equity_percentage ??
      allocation.equity ??
      allocation.stock ??
      0
  );
  const property = Number(
    raw.propertyPercentage ??
      raw.property_percentage ??
      raw.real_estate_percentage ??
      allocation.property ??
      allocation.real_estate ??
      0
  );
  const alertsSource =
    raw.alerts ??
    raw.risk_alerts ??
    raw.recommendations ??
    raw.aiInsights ??
    raw.ai_market_insights;
  const alerts = Array.isArray(alertsSource)
    ? alertsSource.filter((entry) => typeof entry === "string" || (entry && typeof entry === "object"))
    : [];

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.info("[normalizer]", {
      stage: "insights",
      rawPayloadKeys: Object.keys(raw).length,
      alertsCount: alerts.length,
      rejectedEntities: Array.isArray(alertsSource) ? Math.max(alertsSource.length - alerts.length, 0) : 0,
    });
  }

  return {
    equityPercentage: Number.isFinite(equity) ? equity : 0,
    propertyPercentage: Number.isFinite(property) ? property : 0,
    alerts,
  };
}
