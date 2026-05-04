/**
 * Pure portfolio analytics functions.
 * No side-effects, no I/O — safe to call from both server and client code.
 *
 * Asset-class classification by symbol convention:
 *   Equity       – any symbol that is NOT a pure number AND does not start with "PROP-"
 *   Mutual Fund  – symbol is a pure integer string (e.g. "120716")
 *   Real Estate  – symbol starts with "PROP-"
 */

// ── Minimal portfolio item shape ────────────────────────────────────────────

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

// ── Asset-class helpers ──────────────────────────────────────────────────────

function isMutualFund(symbol: string): boolean {
  return /^\d+$/.test(symbol);
}

function isRealEstate(symbol: string): boolean {
  return symbol.startsWith("PROP-");
}

function isEquity(symbol: string): boolean {
  return !isMutualFund(symbol) && !isRealEstate(symbol);
}

/** Return the effective current price, falling back to avg_price when missing or zero */
function effectivePrice(item: PortfolioItem): number {
  const current = Number(item.currentPrice);
  if (Number.isFinite(current) && current > 0) {
    return current;
  }
  const avg = Number(item.avgPrice);
  return Number.isFinite(avg) ? avg : 0;
}

// ── Task 2 — Portfolio Metrics ───────────────────────────────────────────────

export interface PortfolioMetrics {
  invested: number;
  current: number;
  pnl: number;
  returnPct: number;
}

/**
 * Compute core portfolio metrics.
 * `invested`  = Σ (quantity × avg_price)
 * `current`   = Σ (quantity × current_price)   [falls back to avg_price]
 * `pnl`       = current − invested
 * `returnPct` = (pnl / invested) × 100
 */
export function computePortfolioMetrics(
  items: PortfolioItem[]
): PortfolioMetrics {
  if (items.length === 0) {
    return { invested: 0, current: 0, pnl: 0, returnPct: 0 };
  }

  const invested = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.avgPrice) || 0),
    0
  );
  const current = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * effectivePrice(item),
    0
  );

  const pnl = current - invested;
  const returnPct = invested > 0 ? (pnl / invested) * 100 : 0;

  return {
    invested,
    current,
    pnl,
    returnPct: parseFloat(returnPct.toFixed(2)),
  };
}

// ── Task 3 — Allocation + Risk ───────────────────────────────────────────────

export interface Allocation {
  equity: number;     // percentage
  mf: number;         // percentage
  realEstate: number; // percentage
}

export type RiskLevel = "Low" | "Medium" | "High";

export interface RiskResult {
  allocation: Allocation;
  riskLevel: RiskLevel;
}

/**
 * Break down portfolio value by asset class and return percentages.
 * Percentages are rounded to one decimal place and sum to ~100%.
 */
export function computeAllocation(items: PortfolioItem[]): Allocation {
  if (items.length === 0) {
    return { equity: 0, mf: 0, realEstate: 0 };
  }

  let equityVal = 0;
  let mfVal = 0;
  let reVal = 0;

  for (const item of items) {
    const val = (Number(item.quantity) || 0) * effectivePrice(item);
    if (isRealEstate(item.symbol)) {
      reVal += val;
    } else if (isMutualFund(item.symbol)) {
      mfVal += val;
    } else {
      equityVal += val;
    }
  }

  const total = equityVal + mfVal + reVal;
  if (total === 0) return { equity: 0, mf: 0, realEstate: 0 };

  const equity = parseFloat(((equityVal / total) * 100).toFixed(1));
  const mf = parseFloat(((mfVal / total) * 100).toFixed(1));
  // Derive the third from the remainder to avoid floating-point drift
  const realEstate = parseFloat((100 - equity - mf).toFixed(1));

  return { equity, mf, realEstate };
}

/**
 * Determine risk level from allocation rules:
 *   High   – equity > 70 %
 *   Medium – equity 40–70 %
 *   Low    – equity < 40 %
 * Risk is upgraded one level when any single asset exceeds 50 % of the
 * portfolio (concentration risk).
 */
export function computeRiskScore(items: PortfolioItem[]): RiskResult {
  const allocation = computeAllocation(items);

  let riskLevel: RiskLevel;
  if (allocation.equity > 70) {
    riskLevel = "High";
  } else if (allocation.equity >= 40) {
    riskLevel = "Medium";
  } else {
    riskLevel = "Low";
  }

  // Concentration-risk upgrade
  if (riskLevel !== "High" && items.length > 0) {
    const total = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * effectivePrice(item),
      0
    );
    if (total > 0) {
      const maxConcentration = items.reduce((max, item) => {
        const pct = ((Number(item.quantity) || 0) * effectivePrice(item)) / total;
        return Math.max(max, pct);
      }, 0);

      if (maxConcentration > 0.5) {
        riskLevel = riskLevel === "Low" ? "Medium" : "High";
      }
    }
  }

  return { allocation, riskLevel };
}

// ── Task 4 — Recommendations ────────────────────────────────────────────────

export interface Recommendation {
  message: string;
  type: "buy" | "sell" | "rebalance";
  priority: "low" | "medium" | "high";
}

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Annualised benchmark return used for recommendations and alert thresholds.
 * 8 % represents a reasonable long-term equity-balanced portfolio return.
 * Adjust here if the target benchmark changes (e.g. for different markets).
 */
export const BENCHMARK_RETURN_PCT = 8;

/**
 * Generate structured, actionable recommendations based on allocation and
 * portfolio return relative to the benchmark.
 */
export function generateRecommendations(
  allocation: Allocation,
  returnPct: number
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (allocation.equity > 70) {
    recs.push({
      message: "Reduce equity exposure",
      type: "sell",
      priority: "high",
    });
  }

  if (allocation.realEstate < 20) {
    recs.push({
      message: "Add real estate investment",
      type: "buy",
      priority: allocation.realEstate < 5 ? "high" : "medium",
    });
  }

  if (returnPct < BENCHMARK_RETURN_PCT) {
    recs.push({
      message: "Rebalance portfolio — return below benchmark",
      type: "rebalance",
      priority: "medium",
    });
  }

  if (allocation.mf < 15) {
    recs.push({
      message: "Add mutual funds for diversification",
      type: "buy",
      priority: "low",
    });
  }

  return recs;
}

// ── Task 5 — Alerts ──────────────────────────────────────────────────────────

export interface PortfolioAlert {
  message: string;
  severity: "low" | "medium" | "high";
}

/**
 * Derive alerts for a single client portfolio.
 * Conditions checked:
 *   - Overexposed equity (> 70 %)
 *   - Portfolio underperforming benchmark
 *   - Concentration risk (single asset > 50 %)
 *   - Low diversification (only one asset class present)
 */
export function deriveClientAlerts(
  allocation: Allocation,
  returnPct: number,
  items: PortfolioItem[]
): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];

  if (allocation.equity > 70) {
    alerts.push({
      message: "Overexposed to equity (>70%)",
      severity: "high",
    });
  }

  if (returnPct < BENCHMARK_RETURN_PCT) {
    alerts.push({
      message: `Portfolio underperforming: ${returnPct.toFixed(1)}% vs ${BENCHMARK_RETURN_PCT}% benchmark`,
      severity: "medium",
    });
  }

  // Concentration risk: single asset > 50 % of total
  if (items.length > 0) {
    const total = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * effectivePrice(item),
      0
    );
    if (total > 0) {
      const concentrated = items.find(
        (item) => ((Number(item.quantity) || 0) * effectivePrice(item)) / total > 0.5
      );
      if (concentrated) {
        alerts.push({
          message: `Concentration risk: ${concentrated.symbol} exceeds 50% of portfolio`,
          severity: "high",
        });
      }
    }
  }

  // Low diversification: only one asset class is non-zero
  const classCount = [
    allocation.equity > 0,
    allocation.mf > 0,
    allocation.realEstate > 0,
  ].filter(Boolean).length;

  if (classCount <= 1) {
    alerts.push({
      message: "Low diversification — portfolio concentrated in one asset class",
      severity: "medium",
    });
  }

  return alerts;
}
