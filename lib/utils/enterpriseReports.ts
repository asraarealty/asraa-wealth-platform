import type {
  EnterpriseClientReport,
  EnterpriseReportsData,
  EnterpriseSeriesPoint,
  OccupancyHeatmapPoint,
  RiskLevel,
  SuggestedAction,
} from "@/lib/types/enterpriseReports";

function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = safeNumber(value, NaN);
  return Number.isFinite(numeric) ? numeric : null;
}

function safeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  return value === "Low" || value === "Medium" || value === "High" ? value : "Low";
}

function normalizeSuggestedAction(value: unknown): SuggestedAction {
  return value === "Rebalance" || value === "Hold" || value === "Diversify" ? value : "Hold";
}

function normalizeClientStatus(value: unknown): EnterpriseClientReport["status"] {
  return value === "active" || value === "inactive" || value === "suspended" || value === "archived"
    ? value
    : "inactive";
}

function normalizeSeriesPoint(point: unknown): EnterpriseSeriesPoint {
  const row = point && typeof point === "object" ? (point as Record<string, unknown>) : {};
  return {
    label: safeString(row.label, "N/A"),
    value: safeNumber(row.value),
  };
}

function normalizeOccupancyPoint(point: unknown): OccupancyHeatmapPoint {
  const row = point && typeof point === "object" ? (point as Record<string, unknown>) : {};
  const status = row.status;
  return {
    label: safeString(row.label, "Unknown"),
    occupancyPct: safeNumber(row.occupancyPct),
    status:
      status === "fully_occupied" ||
      status === "partially_occupied" ||
      status === "vacant" ||
      status === "unknown"
        ? status
        : "unknown",
  };
}

function normalizeClient(client: unknown): EnterpriseClientReport {
  const row = client && typeof client === "object" ? (client as Record<string, unknown>) : {};
  const recommendations = safeArray<unknown>(row.recommendations)
    .map((item) => safeString(item).trim())
    .filter(Boolean);

  return {
    clientId: safeNumber(row.clientId),
    name: safeString(row.name, "Unknown Client"),
    email: safeString(row.email, "No email"),
    status: normalizeClientStatus(row.status),
    isActive: safeBoolean(row.isActive),
    holdings: safeNumber(row.holdings),
    transactions: safeNumber(row.transactions),
    totalInvested: safeNumber(row.totalInvested),
    portfolioValue: safeNumber(row.portfolioValue),
    gainsLosses: safeNumber(row.gainsLosses),
    returnPercent: safeNumber(row.returnPercent),
    cagr: safeNullableNumber(row.cagr),
    xirr: safeNullableNumber(row.xirr),
    riskLevel: normalizeRiskLevel(row.riskLevel),
    riskScore: safeNumber(row.riskScore),
    diversificationScore: safeNumber(row.diversificationScore),
    equityPct: safeNumber(row.equityPct),
    mfPct: safeNumber(row.mfPct),
    realEstatePct: safeNumber(row.realEstatePct),
    commodityPct: safeNumber(row.commodityPct),
    suggestedAction: normalizeSuggestedAction(row.suggestedAction),
    recommendations: recommendations.length > 0 ? recommendations : ["No advisor note available."],
  };
}

export function normalizeEnterpriseReportsData(payload: unknown): EnterpriseReportsData {
  const raw = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const allocationRaw =
    raw.allocationPct && typeof raw.allocationPct === "object"
      ? (raw.allocationPct as Record<string, unknown>)
      : {};
  const riskDistributionRaw =
    raw.riskDistribution && typeof raw.riskDistribution === "object"
      ? (raw.riskDistribution as Record<string, unknown>)
      : {};
  const realEstateRaw =
    raw.realEstate && typeof raw.realEstate === "object"
      ? (raw.realEstate as Record<string, unknown>)
      : {};

  return {
    generatedAt: safeString(raw.generatedAt, new Date().toISOString()),
    hasPortfolioData: safeBoolean(raw.hasPortfolioData),
    hasRealEstateData: safeBoolean(raw.hasRealEstateData),
    totalClients: safeNumber(raw.totalClients),
    activeClients: safeNumber(raw.activeClients),
    totalAum: safeNumber(raw.totalAum),
    totalInvested: safeNumber(raw.totalInvested),
    totalReturns: safeNumber(raw.totalReturns),
    portfolioGrowthPct: safeNumber(raw.portfolioGrowthPct),
    allocationPct: {
      equity: safeNumber(allocationRaw.equity),
      mf: safeNumber(allocationRaw.mf),
      realEstate: safeNumber(allocationRaw.realEstate),
      commodity: safeNumber(allocationRaw.commodity),
    },
    riskExposureScore: safeNumber(raw.riskExposureScore),
    diversificationScore: safeNumber(raw.diversificationScore),
    diversificationWarnings: safeArray<unknown>(raw.diversificationWarnings)
      .map((item) => safeString(item).trim())
      .filter(Boolean),
    riskDistribution: {
      low: safeNumber(riskDistributionRaw.low),
      medium: safeNumber(riskDistributionRaw.medium),
      high: safeNumber(riskDistributionRaw.high),
    },
    occupancyPct: safeNullableNumber(raw.occupancyPct),
    rentalYieldPct: safeNullableNumber(raw.rentalYieldPct),
    noi: safeNullableNumber(raw.noi),
    realEstate: {
      properties: safeNumber(realEstateRaw.properties),
      tenants: safeNumber(realEstateRaw.tenants),
      leases: safeNumber(realEstateRaw.leases),
      leaseExpiring: safeNumber(realEstateRaw.leaseExpiring),
      leaseExpired: safeNumber(realEstateRaw.leaseExpired),
      vacantUnits: safeNumber(realEstateRaw.vacantUnits),
      rentCollected: safeNullableNumber(realEstateRaw.rentCollected),
      pendingRent: safeNullableNumber(realEstateRaw.pendingRent),
      overdueRent: safeNullableNumber(realEstateRaw.overdueRent),
      maintenanceOpen: safeNumber(realEstateRaw.maintenanceOpen),
      maintenanceInProgress: safeNumber(realEstateRaw.maintenanceInProgress),
      maintenanceResolved: safeNumber(realEstateRaw.maintenanceResolved),
      maintenanceCosts: safeNullableNumber(realEstateRaw.maintenanceCosts),
    },
    performanceSeries: safeArray<unknown>(raw.performanceSeries).map(normalizeSeriesPoint),
    cashflowSeries: safeArray<unknown>(raw.cashflowSeries).map(normalizeSeriesPoint),
    allocationSeries: safeArray<unknown>(raw.allocationSeries).map(normalizeSeriesPoint),
    riskSeries: safeArray<unknown>(raw.riskSeries).map(normalizeSeriesPoint),
    occupancyHeatmap: safeArray<unknown>(raw.occupancyHeatmap).map(normalizeOccupancyPoint),
    clients: safeArray<unknown>(raw.clients).map(normalizeClient),
  };
}
