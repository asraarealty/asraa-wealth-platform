import type { InsightsResponse } from "@/lib/api";

export function normalizeInsights(value: unknown): InsightsResponse | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const equity = Number(raw.equityPercentage ?? raw.equity_percentage ?? 0);
  const property = Number(raw.propertyPercentage ?? raw.property_percentage ?? raw.real_estate_percentage ?? 0);
  const alerts = Array.isArray(raw.alerts)
    ? raw.alerts.filter((entry) => typeof entry === "string" || (entry && typeof entry === "object"))
    : [];
  return {
    equityPercentage: Number.isFinite(equity) ? equity : 0,
    propertyPercentage: Number.isFinite(property) ? property : 0,
    alerts,
  };
}
