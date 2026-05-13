import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/security/api";
import { requireAuth } from "@/lib/security/auth";
import { securityLog } from "@/lib/security/logging";
import type {
  EnterpriseClientReport,
  EnterpriseReportsData,
  EnterpriseSeriesPoint,
  OccupancyHeatmapPoint,
  RiskLevel,
  SuggestedAction,
} from "@/lib/types/enterpriseReports";

const BACKEND =
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://api.asraarealty.in"
    : "http://localhost:8000");

type BackendClient = {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
};

type BackendAsset = {
  id: number;
  symbol?: string;
  type?: string;
  asset_type?: string;
  quantity?: number;
  avgPrice?: number;
  avg_price?: number;
  currentPrice?: number;
  current_price?: number;
  value?: number;
};

type BackendTransaction = {
  id: number | string;
  type?: "buy" | "sell" | string;
  total?: number;
  amount?: number;
  price?: number;
  quantity?: number;
  date?: string;
  created_at?: string;
};

type BackendLease = {
  status?: string;
};

type BackendProperty = {
  name?: string;
  occupancyStatus?: string;
  occupancy_status?: string;
  leasedUnits?: number;
  leased_units?: number;
  totalUnits?: number;
  total_units?: number;
};

type BackendMaintenance = {
  status?: string;
};

type BackendAnalytics = {
  noiGrowth?: EnterpriseSeriesPoint[];
  rentTrend?: EnterpriseSeriesPoint[];
  cashflowForecast?: EnterpriseSeriesPoint[];
  occupancyGraph?: Array<{ label?: string; value?: number }>;
  rentalYieldPercent?: number;
  maintenanceCosts?: number;
};

type BackendRentSummary = {
  occupancyPercent?: number;
  yieldPercent?: number;
  noi?: number;
  rentCollected?: number;
  pendingRent?: number;
  overdueRent?: number;
};

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toAssetType(rawType: string | undefined): "equity" | "mf" | "realEstate" | "commodity" {
  const t = String(rawType ?? "").toLowerCase();
  if (t === "mf" || t === "mutual_fund") return "mf";
  if (t === "property" || t === "real_estate") return "realEstate";
  if (t === "commodity") return "commodity";
  return "equity";
}

function getAssetValue(asset: BackendAsset): number {
  const direct = safeNum(asset.value);
  if (direct > 0) return direct;
  const qty = safeNum(asset.quantity);
  const price = safeNum(asset.currentPrice ?? asset.current_price ?? asset.avgPrice ?? asset.avg_price);
  return qty * price;
}

function getInvestedValue(asset: BackendAsset): number {
  return safeNum(asset.quantity) * safeNum(asset.avgPrice ?? asset.avg_price);
}

function normalizePortfolioResponse(raw: unknown): BackendAsset[] {
  if (Array.isArray(raw)) return raw as BackendAsset[];
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.assets)) return obj.assets as BackendAsset[];
  if (Array.isArray(obj.positions)) return obj.positions as BackendAsset[];
  if (obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (Array.isArray(data.assets)) return data.assets as BackendAsset[];
    if (Array.isArray(data.positions)) return data.positions as BackendAsset[];
  }
  return [];
}

function normalizeListResponse<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as T[];
  return [];
}

function normalizeObjectResponse<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as T;
  }
  return raw as T;
}

function riskFromEquityPct(equityPct: number): RiskLevel {
  if (equityPct > 70) return "High";
  if (equityPct >= 40) return "Medium";
  return "Low";
}

function riskScoreFromLevel(level: RiskLevel): number {
  if (level === "High") return 85;
  if (level === "Medium") return 55;
  return 25;
}

function diversificationScoreFromAllocation(parts: number[]): number {
  const normalized = parts.filter((x) => x > 0).map((x) => x / 100);
  if (normalized.length === 0) return 0;
  const hhi = normalized.reduce((sum, part) => sum + part * part, 0);
  const score = (1 - hhi) * 100;
  return Number(Math.max(0, Math.min(100, score)).toFixed(1));
}

function toSuggestedAction(
  equityPct: number,
  mfPct: number,
  realEstatePct: number
): SuggestedAction {
  if (equityPct > 65) return "Rebalance";
  if (mfPct < 15 && realEstatePct < 10) return "Diversify";
  return "Hold";
}

function cagrFromDates(invested: number, current: number, firstDate: string | null): number | null {
  if (!firstDate || invested <= 0 || current <= 0) return null;
  const start = new Date(firstDate);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years <= 0) return null;
  const cagr = (Math.pow(current / invested, 1 / years) - 1) * 100;
  if (!Number.isFinite(cagr)) return null;
  return Number(cagr.toFixed(2));
}

function xirr(cashflows: Array<{ date: Date; amount: number }>): number | null {
  if (cashflows.length < 2) return null;
  const hasPositive = cashflows.some((f) => f.amount > 0);
  const hasNegative = cashflows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const startDate = cashflows.reduce((min, c) => (c.date < min ? c.date : min), cashflows[0].date);
  const yearFrac = (d: Date) => (d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const npv = (rate: number) =>
    cashflows.reduce((sum, c) => sum + c.amount / Math.pow(1 + rate, yearFrac(c.date)), 0);

  let rate = 0.1;
  for (let i = 0; i < 50; i += 1) {
    const value = npv(rate);
    const eps = 1e-7;
    const derivative = (npv(rate + eps) - value) / eps;
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-10) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -0.9999 || next > 10) break;
    if (Math.abs(next - rate) < 1e-8) {
      rate = next;
      break;
    }
    rate = next;
  }

  if (!Number.isFinite(rate)) return null;
  return Number((rate * 100).toFixed(2));
}

async function backendGet(path: string, authHeader: string): Promise<unknown> {
  const response = await fetch(`${BACKEND}${path}`, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }
  return response.json();
}

function buildClientReport(
  client: BackendClient,
  assets: BackendAsset[],
  transactions: BackendTransaction[]
): EnterpriseClientReport {
  const totals = assets.reduce(
    (acc, asset) => {
      const type = toAssetType(asset.type ?? asset.asset_type);
      const value = getAssetValue(asset);
      const invested = getInvestedValue(asset);
      if (type === "equity") acc.equity += value;
      if (type === "mf") acc.mf += value;
      if (type === "realEstate") acc.realEstate += value;
      if (type === "commodity") acc.commodity += value;
      acc.current += value;
      acc.invested += invested;
      return acc;
    },
    { equity: 0, mf: 0, realEstate: 0, commodity: 0, invested: 0, current: 0 }
  );

  const current = totals.current;
  const invested = totals.invested;
  const returns = current - invested;
  const returnPercent = invested > 0 ? (returns / invested) * 100 : 0;

  const eqPct = current > 0 ? (totals.equity / current) * 100 : 0;
  const mfPct = current > 0 ? (totals.mf / current) * 100 : 0;
  const rePct = current > 0 ? (totals.realEstate / current) * 100 : 0;
  const comPct = current > 0 ? (totals.commodity / current) * 100 : 0;

  const riskLevel = riskFromEquityPct(eqPct);
  const riskScore = riskScoreFromLevel(riskLevel);
  const diversificationScore = diversificationScoreFromAllocation([eqPct, mfPct, rePct, comPct]);
  const suggestedAction = toSuggestedAction(eqPct, mfPct, rePct);

  const firstTxnDate =
    transactions
      .map((t) => String(t.date ?? t.created_at ?? "").trim())
      .filter(Boolean)
      .sort()[0] ?? null;

  const cagr = cagrFromDates(invested, current, firstTxnDate);

  const flowEntries = transactions
    .map((txn) => {
      const dateValue = String(txn.date ?? txn.created_at ?? "").trim();
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return null;
      const qty = safeNum(txn.quantity);
      const amount = safeNum(txn.total ?? txn.amount ?? (qty * safeNum(txn.price)));
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const type = String(txn.type ?? "").toLowerCase();
      return {
        date,
        amount: type === "sell" ? amount : -amount,
      };
    })
    .filter((x): x is { date: Date; amount: number } => Boolean(x));

  const terminalFlow = current > 0 ? [{ date: new Date(), amount: current }] : [];
  const xirrValue = xirr([...flowEntries, ...terminalFlow]);

  const recommendations: string[] = [];
  if (eqPct > 70) recommendations.push("Reduce concentrated equity exposure.");
  if (mfPct < 15) recommendations.push("Increase mutual fund allocation for diversification.");
  if (rePct < 10) recommendations.push("Improve real-estate exposure for yield stability.");
  if (returnPercent < 6) recommendations.push("Review underperforming holdings and rebalance.");
  if (recommendations.length === 0) recommendations.push("Portfolio is balanced. Continue disciplined monitoring.");

  return {
    clientId: client.id,
    name: client.name,
    email: client.email,
    isActive: Boolean(client.isActive ?? true),
    holdings: assets.length,
    transactions: transactions.length,
    totalInvested: Number(invested.toFixed(2)),
    portfolioValue: Number(current.toFixed(2)),
    gainsLosses: Number(returns.toFixed(2)),
    returnPercent: Number(returnPercent.toFixed(2)),
    cagr,
    xirr: xirrValue,
    riskLevel,
    riskScore,
    diversificationScore,
    equityPct: Number(eqPct.toFixed(1)),
    mfPct: Number(mfPct.toFixed(1)),
    realEstatePct: Number(rePct.toFixed(1)),
    commodityPct: Number(comPct.toFixed(1)),
    suggestedAction,
    recommendations,
  };
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    let clients: BackendClient[] = [];
    try {
      clients = normalizeListResponse<BackendClient>(
        await backendGet("/clients", auth.context.authHeader)
      );
    } catch (error) {
      securityLog("warn", "enterprise_reports.clients_fetch_failed", {
        error: String(error),
      });
      clients = [];
    }

    const portfolios = await Promise.allSettled(
      clients.map(async (client) => ({
        clientId: client.id,
        assets: normalizePortfolioResponse(
          await backendGet(`/assets?user_id=${encodeURIComponent(client.id)}`, auth.context.authHeader)
        ),
      }))
    );

    const transactions = await Promise.allSettled(
      clients.map(async (client) => ({
        clientId: client.id,
        rows: normalizeListResponse<BackendTransaction>(
          await backendGet(`/transactions?client_id=${encodeURIComponent(client.id)}`, auth.context.authHeader)
        ),
      }))
    );

    const assetsByClient = new Map<number, BackendAsset[]>();
    portfolios.forEach((result, idx) => {
      const clientId = clients[idx]?.id;
      if (!clientId) return;
      assetsByClient.set(
        clientId,
        result.status === "fulfilled" ? result.value.assets : []
      );
    });

    const txByClient = new Map<number, BackendTransaction[]>();
    transactions.forEach((result, idx) => {
      const clientId = clients[idx]?.id;
      if (!clientId) return;
      txByClient.set(
        clientId,
        result.status === "fulfilled" ? result.value.rows : []
      );
    });

    const clientReports = clients.map((client) =>
      buildClientReport(
        client,
        assetsByClient.get(client.id) ?? [],
        txByClient.get(client.id) ?? []
      )
    );

    const totalAum = clientReports.reduce((sum, row) => sum + row.portfolioValue, 0);
    const totalInvested = clientReports.reduce((sum, row) => sum + row.totalInvested, 0);
    const totalReturns = totalAum - totalInvested;
    const growthPct = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    const allocation = clientReports.reduce(
      (acc, row) => {
        const weight = row.portfolioValue;
        if (weight <= 0) return acc;
        acc.equity += row.equityPct * weight;
        acc.mf += row.mfPct * weight;
        acc.realEstate += row.realEstatePct * weight;
        acc.commodity += row.commodityPct * weight;
        acc.den += weight;
        return acc;
      },
      { equity: 0, mf: 0, realEstate: 0, commodity: 0, den: 0 }
    );

    const allocationPct = allocation.den > 0
      ? {
          equity: Number((allocation.equity / allocation.den).toFixed(1)),
          mf: Number((allocation.mf / allocation.den).toFixed(1)),
          realEstate: Number((allocation.realEstate / allocation.den).toFixed(1)),
          commodity: Number((allocation.commodity / allocation.den).toFixed(1)),
        }
      : { equity: 0, mf: 0, realEstate: 0, commodity: 0 };

    const riskDistribution = clientReports.reduce(
      (acc, row) => {
        if (row.riskLevel === "Low") acc.low += 1;
        else if (row.riskLevel === "Medium") acc.medium += 1;
        else acc.high += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    const riskExposureScore =
      clientReports.length > 0
        ? Number(
            (
              clientReports.reduce((sum, row) => sum + row.riskScore, 0) /
              clientReports.length
            ).toFixed(1)
          )
        : 0;

    const diversificationScore =
      clientReports.length > 0
        ? Number(
            (
              clientReports.reduce((sum, row) => sum + row.diversificationScore, 0) /
              clientReports.length
            ).toFixed(1)
          )
        : 0;

    const diversificationWarnings: string[] = [];
    if (allocationPct.equity > 70) {
      diversificationWarnings.push("Equity exposure exceeds 70% at portfolio level.");
    }
    if (allocationPct.realEstate < 10) {
      diversificationWarnings.push("Real-estate allocation is below strategic minimum.");
    }
    if (allocationPct.mf < 15) {
      diversificationWarnings.push("Mutual-fund allocation is low for diversification goals.");
    }
    if (diversificationScore < 45) {
      diversificationWarnings.push("Diversification score is weak; concentration risk elevated.");
    }

    let properties: BackendProperty[] = [];
    let tenants: Array<Record<string, unknown>> = [];
    let leases: BackendLease[] = [];
    let maintenance: BackendMaintenance[] = [];
    let rentSummary: BackendRentSummary | null = null;
    let analytics: BackendAnalytics | null = null;
    let realEstateAvailable = true;

    try {
      const [
        propertiesRaw,
        tenantsRaw,
        leasesRaw,
        maintenanceRaw,
        rentSummaryRaw,
        analyticsRaw,
      ] = await Promise.all([
        backendGet("/real-estate/properties", auth.context.authHeader),
        backendGet("/real-estate/tenants", auth.context.authHeader),
        backendGet("/real-estate/leases", auth.context.authHeader),
        backendGet("/real-estate/maintenance/tickets", auth.context.authHeader),
        backendGet("/real-estate/rent/summary", auth.context.authHeader),
        backendGet("/real-estate/analytics", auth.context.authHeader),
      ]);
      properties = normalizeListResponse<BackendProperty>(propertiesRaw);
      tenants = normalizeListResponse<Record<string, unknown>>(tenantsRaw);
      leases = normalizeListResponse<BackendLease>(leasesRaw);
      maintenance = normalizeListResponse<BackendMaintenance>(maintenanceRaw);
      rentSummary = normalizeObjectResponse<BackendRentSummary>(rentSummaryRaw);
      analytics = normalizeObjectResponse<BackendAnalytics>(analyticsRaw);
    } catch (error) {
      realEstateAvailable = false;
      securityLog("warn", "enterprise_reports.real_estate_fetch_failed", {
        error: String(error),
      });
    }

    const occupancyPct =
      rentSummary?.occupancyPercent !== undefined
        ? safeNum(rentSummary.occupancyPercent)
        : null;
    const rentalYieldPct =
      rentSummary?.yieldPercent !== undefined
        ? safeNum(rentSummary.yieldPercent)
        : analytics?.rentalYieldPercent !== undefined
          ? safeNum(analytics.rentalYieldPercent)
          : null;
    const noi = rentSummary?.noi !== undefined ? safeNum(rentSummary.noi) : null;

    const occupancyHeatmap: OccupancyHeatmapPoint[] = properties.map((property, index) => {
      const statusRaw = String(property.occupancyStatus ?? property.occupancy_status ?? "").toLowerCase();
      const status =
        statusRaw === "fully_occupied" || statusRaw === "partially_occupied" || statusRaw === "vacant"
          ? statusRaw
          : "unknown";
      const occupancyByStatus =
        status === "fully_occupied" ? 100 : status === "partially_occupied" ? 60 : status === "vacant" ? 0 : 0;
      return {
        label: property.name || `Property ${index + 1}`,
        occupancyPct: occupancyByStatus,
        status,
      };
    });

    const performanceSeries = (analytics?.noiGrowth ?? [])
      .map((item) => ({ label: String(item.label ?? ""), value: safeNum(item.value) }))
      .filter((item) => item.label);
    const cashflowSeries = (analytics?.cashflowForecast ?? analytics?.rentTrend ?? [])
      .map((item) => ({ label: String(item.label ?? ""), value: safeNum(item.value) }))
      .filter((item) => item.label);

    const allocationSeries: EnterpriseSeriesPoint[] = [
      { label: "Equity", value: allocationPct.equity },
      { label: "Mutual Funds", value: allocationPct.mf },
      { label: "Real Estate", value: allocationPct.realEstate },
      { label: "Commodity", value: allocationPct.commodity },
    ];

    const riskSeries: EnterpriseSeriesPoint[] = [
      { label: "Low", value: riskDistribution.low },
      { label: "Medium", value: riskDistribution.medium },
      { label: "High", value: riskDistribution.high },
    ];

    const vacantUnits = properties.reduce((sum, property) => {
      const leased = safeNum(property.leasedUnits ?? property.leased_units);
      const total = safeNum(property.totalUnits ?? property.total_units);
      if (total <= 0) return sum;
      return sum + Math.max(0, total - leased);
    }, 0);

    const leaseExpiring = leases.filter((l) => String(l.status ?? "").toLowerCase() === "expiring").length;
    const leaseExpired = leases.filter((l) => String(l.status ?? "").toLowerCase() === "expired").length;

    const maintenanceOpen = maintenance.filter((m) => String(m.status ?? "").toLowerCase() === "open").length;
    const maintenanceInProgress = maintenance.filter(
      (m) => String(m.status ?? "").toLowerCase() === "in_progress"
    ).length;
    const maintenanceResolved = maintenance.filter((m) => {
      const s = String(m.status ?? "").toLowerCase();
      return s === "resolved" || s === "closed";
    }).length;

    const payload: EnterpriseReportsData = {
      generatedAt: new Date().toISOString(),
      hasPortfolioData: clientReports.some((row) => row.portfolioValue > 0 || row.totalInvested > 0),
      hasRealEstateData: realEstateAvailable && (properties.length > 0 || leases.length > 0 || Boolean(rentSummary)),
      totalClients: clients.length,
      activeClients: clients.filter((c) => Boolean(c.isActive ?? true)).length,
      totalAum: Number(totalAum.toFixed(2)),
      totalInvested: Number(totalInvested.toFixed(2)),
      totalReturns: Number(totalReturns.toFixed(2)),
      portfolioGrowthPct: Number(growthPct.toFixed(2)),
      allocationPct,
      riskExposureScore,
      diversificationScore,
      diversificationWarnings,
      riskDistribution,
      occupancyPct: occupancyPct !== null ? Number(occupancyPct.toFixed(1)) : null,
      rentalYieldPct: rentalYieldPct !== null ? Number(rentalYieldPct.toFixed(2)) : null,
      noi: noi !== null ? Number(noi.toFixed(2)) : null,
      realEstate: {
        properties: properties.length,
        tenants: tenants.length,
        leases: leases.length,
        leaseExpiring,
        leaseExpired,
        vacantUnits,
        rentCollected:
          rentSummary?.rentCollected !== undefined ? Number(safeNum(rentSummary.rentCollected).toFixed(2)) : null,
        pendingRent:
          rentSummary?.pendingRent !== undefined ? Number(safeNum(rentSummary.pendingRent).toFixed(2)) : null,
        overdueRent:
          rentSummary?.overdueRent !== undefined ? Number(safeNum(rentSummary.overdueRent).toFixed(2)) : null,
        maintenanceOpen,
        maintenanceInProgress,
        maintenanceResolved,
        maintenanceCosts:
          analytics?.maintenanceCosts !== undefined ? Number(safeNum(analytics.maintenanceCosts).toFixed(2)) : null,
      },
      performanceSeries,
      cashflowSeries,
      allocationSeries,
      riskSeries,
      occupancyHeatmap,
      clients: clientReports,
    };

    return apiOk(request, payload);
  } catch (error) {
    securityLog("error", "enterprise_reports.failed", { error: String(error) });
    return apiError(request, 500, "ENTERPRISE_REPORTS_FAILED", "Unable to build enterprise reporting intelligence.");
  }
}

export function OPTIONS(request: NextRequest) {
  return apiOk(request, {}, 204);
}
