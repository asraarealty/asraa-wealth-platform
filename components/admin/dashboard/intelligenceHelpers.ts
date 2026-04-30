/**
 * Shared types and pure helper functions for the admin financial intelligence
 * dashboard.
 *
 * Per-client analytics (metrics, allocation, risk) are now computed server-side
 * in /api/portfolio/intelligence using live Yahoo Finance prices.  This module
 * only contains:
 *   - Shared TypeScript types consumed by UI components
 *   - Pure aggregation helpers that operate on already-computed ClientIntelligence rows
 */

import type { DashboardAlert } from "./AlertsPanel";

export type RiskLevel = "Low" | "Medium" | "High";
export type SuggestedAction = "Rebalance" | "Hold" | "Diversify";

export interface ClientIntelligence {
  clientId: number;
  name: string;
  email: string;
  isActive: boolean;
  portfolioValue: number;
  returnPercent: number;
  riskLevel: RiskLevel;
  equityPct: number;
  mfPct: number;
  realEstatePct: number;
  suggestedAction: SuggestedAction;
}

/**
 * Derive system-generated dashboard alerts by aggregating across all client
 * intelligence rows.
 */
export function deriveAlerts(rows: ClientIntelligence[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  const overExposed = rows.filter((r) => r.equityPct > 70);
  if (overExposed.length > 0) {
    alerts.push({
      id: "equity-overexposure",
      title: `${overExposed.length} client${overExposed.length > 1 ? "s" : ""} overexposed to equities (>70%)`,
      description: `${overExposed.map((r) => r.name).join(", ")} — consider rebalancing into mutual funds or real estate.`,
      severity: "high",
    });
  }

  const underperforming = rows.filter((r) => r.returnPercent < 6);
  if (underperforming.length > 0) {
    alerts.push({
      id: "underperforming",
      title: `${underperforming.length} underperforming portfolio${underperforming.length > 1 ? "s" : ""}`,
      description: `${underperforming.map((r) => r.name).join(", ")} are returning below 6%. Review asset selection.`,
      severity: "medium",
    });
  }

  const lowDiversification = rows.filter(
    (r) => r.equityPct > 60 && r.mfPct < 15 && r.realEstatePct < 10
  );
  if (lowDiversification.length > 0) {
    alerts.push({
      id: "low-diversification",
      title: "Concentrated equity exposure detected",
      description: `${lowDiversification.map((r) => r.name).join(", ")} — high concentration risk; diversify before next review.`,
      severity: "medium",
    });
  }

  const noRE = rows.filter((r) => r.realEstatePct < 5);
  if (noRE.length > 0) {
    alerts.push({
      id: "no-real-estate",
      title: "Real-estate allocation below target for some clients",
      description: `${noRE.length} client${noRE.length > 1 ? "s have" : " has"} near-zero real-estate exposure. Consider adding REIT or direct property.`,
      severity: "low",
    });
  }

  return alerts;
}

/** Calculate the average return % across all client rows. */
export function calcAverageReturn(rows: ClientIntelligence[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + r.returnPercent, 0);
  return parseFloat((sum / rows.length).toFixed(1));
}

