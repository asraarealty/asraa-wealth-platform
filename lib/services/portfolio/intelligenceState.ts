import type { CanonicalAssetHolding } from "@/lib/services/assets";
import type { MarketPricePoint } from "@/lib/services/market";
import { computePortfolioValuation } from "@/lib/services/portfolio/valuationEngine";

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

function readRaw(holding: CanonicalAssetHolding, ...keys: string[]) {
  const record = holding.raw as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  if (!Number.isFinite(value)) return null;
  return Math.floor((Date.now() - value) / (1000 * 60 * 60 * 24));
}

function dueBucket(value?: string | null): "overdue" | "soon" | "future" | "none" {
  if (!value) return "none";
  const due = new Date(value).getTime();
  if (!Number.isFinite(due)) return "none";
  const diff = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 5) return "soon";
  return "future";
}

export interface PortfolioRules {
  concentration: { label: string; level: "low" | "medium" | "high" };
  diversification: { score: number; label: string; level: "low" | "medium" | "high" };
  inactivity: { days: number | null; label: string; level: "low" | "medium" | "high" };
  exposureImbalance: { label: string; level: "low" | "medium" | "high" };
  riskState: "Low" | "Medium" | "High";
}

export interface RealEstateMetrics {
  totalValue: number;
  monthlyIncome: number;
  occupied: number;
  occupancyPct: number;
  overdueRent: number;
  dueSoonRent: number;
  leaseExpiry: number;
  rentalYieldPct: number;
}

export interface PortfolioIntelligenceState {
  summary: {
    totalValue: number;
    totalInvested: number;
    totalReturn: number;
    returnPct: number;
    monthlyIncome: number;
    netWorth: number;
  };
  allocation: {
    stock: number;
    mf: number;
    property: number;
    commodity: number;
  };
  rules: PortfolioRules;
  realEstate: RealEstateMetrics;
  valuation: ReturnType<typeof computePortfolioValuation>;
}

export function computePortfolioIntelligenceState(params: {
  holdings: CanonicalAssetHolding[];
  livePriceMap?: Record<number, MarketPricePoint>;
  lastActivityAt?: string;
}): PortfolioIntelligenceState {
  const holdings = Array.isArray(params.holdings) ? params.holdings : [];
  const livePriceMap = params.livePriceMap ?? {};
  const valuation = computePortfolioValuation(holdings, livePriceMap);

  const largest = Math.max(
    valuation.allocationPct.stock,
    valuation.allocationPct.mf,
    valuation.allocationPct.property,
    valuation.allocationPct.commodity
  );
  const concentration =
    largest >= 60
      ? { label: "High concentration", level: "high" as const }
      : largest >= 35
      ? { label: "Moderate concentration", level: "medium" as const }
      : { label: "Balanced allocation", level: "low" as const };

  const activeClasses = [
    valuation.allocationPct.stock,
    valuation.allocationPct.mf,
    valuation.allocationPct.property,
    valuation.allocationPct.commodity,
  ].filter((value) => value > 0).length;
  const diversificationScore = Math.max(
    0,
    Math.round(activeClasses * 20 + (100 - largest) * 0.4)
  );
  const diversification =
    diversificationScore >= 70
      ? { score: diversificationScore, label: "Well diversified", level: "low" as const }
      : diversificationScore >= 45
      ? { score: diversificationScore, label: "Moderate diversification", level: "medium" as const }
      : { score: diversificationScore, label: "Low diversification", level: "high" as const };

  const inactivityDays = daysSince(params.lastActivityAt);
  const inactivity =
    inactivityDays == null
      ? { days: null, label: "Activity signal pending", level: "medium" as const }
      : inactivityDays > 90
      ? { days: inactivityDays, label: `Inactive for ${inactivityDays} days`, level: "high" as const }
      : inactivityDays > 30
      ? { days: inactivityDays, label: `Watch engagement · ${inactivityDays} days`, level: "medium" as const }
      : { days: inactivityDays, label: `Active within ${Math.max(inactivityDays, 0)} day(s)`, level: "low" as const };

  const marketExposure = valuation.exposurePct.stock + valuation.exposurePct.mf;
  const altExposure = valuation.exposurePct.property + valuation.exposurePct.commodity;
  const exposureGap = Math.abs(marketExposure - altExposure);
  const exposureImbalance =
    exposureGap >= 50
      ? { label: "High exposure imbalance", level: "high" as const }
      : exposureGap >= 25
      ? { label: "Moderate exposure imbalance", level: "medium" as const }
      : { label: "Balanced exposure mix", level: "low" as const };

  const riskState: "Low" | "Medium" | "High" =
    concentration.level === "high" || exposureImbalance.level === "high"
      ? "High"
      : concentration.level === "medium" ||
        exposureImbalance.level === "medium" ||
        inactivity.level === "medium"
      ? "Medium"
      : "Low";

  const properties = holdings.filter((holding) => holding.type === "property");
  const occupied = properties.filter((holding) =>
    Boolean(readRaw(holding, "tenant_name", "tenantName"))
  ).length;
  const overdueRent = properties.filter((holding) =>
    dueBucket((readRaw(holding, "rent_due_date", "rentDueDate") as string | null | undefined) ?? null) === "overdue"
  ).length;
  const dueSoonRent = properties.filter((holding) =>
    dueBucket((readRaw(holding, "rent_due_date", "rentDueDate") as string | null | undefined) ?? null) === "soon"
  ).length;
  const leaseExpiry = properties.filter((holding) => {
    const rawValue = readRaw(holding, "rent_due_date", "rentDueDate");
    if (!rawValue) return false;
    const due = new Date(String(rawValue)).getTime();
    if (!Number.isFinite(due)) return false;
    const diff = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;
  const realEstateValue = valuation.holdings
    .filter((holding) => holding.type === "property")
    .reduce((sum, holding) => sum + n(holding.liveValue, 0), 0);
  const annualIncome = properties.reduce(
    (sum, holding) =>
      sum + n(readRaw(holding, "rent_amount", "rentAmount") ?? holding.monthlyIncome, 0) * 12,
    0
  );
  const monthlyIncome = annualIncome / 12;

  return {
    summary: {
      totalValue: valuation.liveValue,
      totalInvested: valuation.investedValue,
      totalReturn: valuation.unrealizedPnL,
      returnPct: valuation.unrealizedPnLPct,
      monthlyIncome: valuation.monthlyIncome,
      netWorth: valuation.netWorth,
    },
    allocation: {
      stock: valuation.allocationPct.stock,
      mf: valuation.allocationPct.mf,
      property: valuation.allocationPct.property,
      commodity: valuation.allocationPct.commodity,
    },
    rules: {
      concentration,
      diversification,
      inactivity,
      exposureImbalance,
      riskState,
    },
    realEstate: {
      totalValue: realEstateValue,
      monthlyIncome,
      occupied,
      occupancyPct: pct(occupied, properties.length),
      overdueRent,
      dueSoonRent,
      leaseExpiry,
      rentalYieldPct: pct(annualIncome, realEstateValue),
    },
    valuation,
  };
}
