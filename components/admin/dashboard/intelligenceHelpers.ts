/**
 * Shared types and mock-logic helpers for the admin financial intelligence dashboard.
 * All per-client allocation and risk metrics are derived/simulated from the
 * available global portfolio data — the backend does not expose per-client
 * time-series or allocation breakdown in a single request.
 */

import type { AdminClient, AdminPortfolioItem } from "@/lib/api";
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

/** Seeded pseudo-random [0,1) from an integer seed. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/**
 * Build per-client intelligence rows.
 *
 * Portfolio value is proportioned from the real totalAUM using a seeded
 * weight per client.  Allocation percentages and return are derived from the
 * seeded weight so they are stable across re-renders but vary by client.
 */
export function buildClientIntelligence(
  clients: AdminClient[],
  portfolio: AdminPortfolioItem[]
): ClientIntelligence[] {
  if (clients.length === 0) return [];

  // Real aggregate asset class values from the global portfolio
  const totalAUM = portfolio.reduce((s, p) => s + (p.value ?? 0), 0);

  const stockTotal = portfolio
    .filter((p) => p.symbol && !p.symbol.startsWith("PROP-") && !/^\d+$/.test(p.symbol))
    .reduce((s, p) => s + (p.value ?? 0), 0);

  const mfTotal = portfolio
    .filter((p) => /^\d+$/.test(p.symbol))
    .reduce((s, p) => s + (p.value ?? 0), 0);

  const reTotal = portfolio
    .filter((p) => p.symbol?.startsWith("PROP-"))
    .reduce((s, p) => s + (p.value ?? 0), 0);

  // Normalised global allocations (used as a baseline)
  const basedenom = stockTotal + mfTotal + reTotal || 1;
  const baseEquity = (stockTotal / basedenom) * 100;
  const baseMF = (mfTotal / basedenom) * 100;
  const baseRE = (reTotal / basedenom) * 100;

  // Generate weights proportional to client order
  const weights = clients.map((c) => 0.5 + seededRandom(c.id) * 1.5);
  const weightSum = weights.reduce((s, w) => s + w, 0);

  return clients.map((client, idx) => {
    const r = seededRandom(client.id);
    const r2 = seededRandom(client.id * 3);
    const r3 = seededRandom(client.id * 7);

    // Portfolio value proportioned from total AUM
    const portfolioValue = totalAUM > 0
      ? (weights[idx] / weightSum) * totalAUM
      : 0;

    // Return: 4–22% range, seeded per client
    const returnPercent = parseFloat((4 + r * 18).toFixed(1));

    // Allocation: deviate from base by ±20 pp seeded per client, then normalise
    const rawEquity = Math.max(5, Math.min(85, baseEquity + (r - 0.5) * 40));
    const rawMF = Math.max(5, Math.min(60, baseMF + (r2 - 0.5) * 30));
    const rawRE = Math.max(0, Math.min(50, baseRE + (r3 - 0.5) * 20));
    const allocSum = rawEquity + rawMF + rawRE || 1;
    const equityPct = parseFloat(((rawEquity / allocSum) * 100).toFixed(1));
    const mfPct = parseFloat(((rawMF / allocSum) * 100).toFixed(1));
    const realEstatePct = parseFloat((100 - equityPct - mfPct).toFixed(1));

    // Risk level
    const riskLevel: RiskLevel =
      equityPct > 65 ? "High" : equityPct > 40 ? "Medium" : "Low";

    // Suggested action
    let suggestedAction: SuggestedAction;
    if (equityPct > 65) {
      suggestedAction = "Rebalance";
    } else if (mfPct < 15 && realEstatePct < 10) {
      suggestedAction = "Diversify";
    } else {
      suggestedAction = "Hold";
    }

    return {
      clientId: client.id,
      name: client.name,
      email: client.email,
      isActive: client.is_active,
      portfolioValue,
      returnPercent,
      riskLevel,
      equityPct,
      mfPct,
      realEstatePct,
      suggestedAction,
    };
  });
}

/** Derive system-generated alerts from the client intelligence rows. */
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
      description: `${lowDiversification.map((r) => r.name).join(", ")} — high PE risk; diversify before next review.`,
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

/** Calculate a single average return % across all client rows. */
export function calcAverageReturn(rows: ClientIntelligence[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + r.returnPercent, 0);
  return parseFloat((sum / rows.length).toFixed(1));
}
