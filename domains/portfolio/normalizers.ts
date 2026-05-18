import { fetcher } from "@/lib/fetcher";
import type { Asset } from "@/lib/types/assets";
import type { Transaction } from "@/lib/api";
import { EMPTY_PORTFOLIO_OPERATING_DATA, type EventType, type PortfolioOperatingData } from "./types";

const asNum = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asStr = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const unwrapPayload = (value: unknown): Record<string, unknown> => {
  const root = asRecord(value);
  const levelOne = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? asRecord(root.data) : root;
  return levelOne.data && typeof levelOne.data === "object" && !Array.isArray(levelOne.data)
    ? asRecord(levelOne.data)
    : levelOne;
};

const normalizeSeverity = (value: unknown): "low" | "medium" | "high" => {
  const text = String(value ?? "").toLowerCase();
  if (text === "high") return "high";
  if (text === "medium") return "medium";
  return "low";
};

const normalizeRiskState = (value: unknown): "Low" | "Medium" | "High" => {
  const text = String(value ?? "").toLowerCase();
  if (text === "high") return "High";
  if (text === "medium") return "Medium";
  return "Low";
};

const classifyAlertType = (value: unknown): EventType => {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("risk") || text.includes("overexposed") || text.includes("loss")) return "risk";
  if (text.includes("rent") || text.includes("tenant") || text.includes("lease")) return "rent";
  if (text.includes("cash") || text.includes("income")) return "cashflow";
  if (text.includes("rebalance") || text.includes("drift")) return "drift";
  return "opportunity";
};

export function normalizeDashboardFullPayload(payloadValue: unknown): PortfolioOperatingData {
  const payload = unwrapPayload(payloadValue);
  const summaryRaw = asRecord(payload.summary);
  const portfolioRaw = asRecord(payload.portfolio);
  const allocationRaw = asRecord(payload.allocation);
  const intelligenceRaw = asRecord(payload.intelligence);
  const riskRaw = asRecord(payload.risk ?? intelligenceRaw.risk);
  const insightsRaw = asArray<Record<string, unknown> | string>(payload.insights ?? intelligenceRaw.alerts);
  const recommendationsRaw = asArray<Record<string, unknown>>(payload.recommendations);
  const activityRaw = asArray<Record<string, unknown>>(payload.activity_feed ?? payload.activityFeed);

  const assets = asArray<Asset>(portfolioRaw.assets ?? portfolioRaw.holdings ?? portfolioRaw.positions);
  const explicitProperties = asArray<Asset>(portfolioRaw.properties);
  const properties = explicitProperties.length > 0 ? explicitProperties : assets.filter((asset) => asset?.type === "property");
  const transactions = asArray<Transaction>(portfolioRaw.transactions);

  const typedAlerts = insightsRaw.slice(0, 12).map((alert, index) => {
    if (typeof alert === "string") {
      return {
        id: `insight-${index}`,
        type: classifyAlertType(alert),
        title: alert.length > 55 ? `${alert.slice(0, 55)}…` : alert,
        message: alert,
        timestamp: new Date().toISOString(),
      };
    }
    const title = asStr(alert?.title, asStr(alert?.type, "Insight"));
    const message = asStr(alert?.message, asStr(alert?.body, title));
    return {
      id: asStr(alert?.id, `insight-${index}`),
      type: classifyAlertType(alert?.type ?? title),
      title,
      message,
      timestamp: asStr(alert?.timestamp, new Date().toISOString()),
    };
  });

  const activityFeed = activityRaw.map((event, index) => {
    const title = asStr(event?.title, "Activity");
    const message = asStr(event?.message, asStr(event?.body, ""));
    return {
      id: asStr(event?.id, `activity-${index}`),
      type: classifyAlertType(event?.type ?? title),
      title,
      message,
      timestamp: asStr(event?.timestamp, new Date().toISOString()),
    };
  });

  const recommendations = recommendationsRaw.map((rec, index) => ({
    id: asStr(rec?.id, `recommendation-${index}`),
    title: asStr(rec?.title, "Recommendation"),
    rationale: asStr(rec?.rationale, asStr(rec?.message, "")),
    confidence: asNum(rec?.confidence, 0),
  }));

  const priorityActionsRaw = asArray<Record<string, unknown>>(riskRaw.priority_actions ?? riskRaw.priorityActions);
  const priorityActions = priorityActionsRaw.map((item, index) => ({
    id: asStr(item?.id, `priority-${index}`),
    title: asStr(item?.title, "Action required"),
    description: asStr(item?.description, asStr(item?.message, "")),
    severity: normalizeSeverity(item?.severity),
  }));

  const realEstateRaw = asRecord(portfolioRaw.real_estate ?? portfolioRaw.realEstate);
  const occupied = asNum(realEstateRaw.occupied, properties.filter((p) => Boolean(p?.tenant_name)).length);
  const totalProperties = properties.length;
  const serverOccupancyPct = asNum(realEstateRaw.occupancy_pct ?? realEstateRaw.occupancyPct, Number.NaN);
  const occupancyPct = Number.isFinite(serverOccupancyPct)
    ? serverOccupancyPct
    : totalProperties > 0
      ? (occupied / totalProperties) * 100
      : 0;

  const summary = {
    total_value: asNum(summaryRaw.total_value ?? summaryRaw.totalValue),
    total_invested: asNum(summaryRaw.total_invested ?? summaryRaw.totalInvested),
    total_return: asNum(summaryRaw.total_return ?? summaryRaw.totalReturn),
    return_percentage: asNum(summaryRaw.return_percentage ?? summaryRaw.returnPercentage),
    monthly_income: asNum(summaryRaw.monthly_income ?? summaryRaw.monthlyIncome),
    net_worth: asNum(summaryRaw.net_worth ?? summaryRaw.netWorth),
  };

  const allocation = {
    stock: asNum(allocationRaw.stock ?? allocationRaw.equity),
    mf: asNum(allocationRaw.mf ?? allocationRaw.mutual_funds ?? allocationRaw.mutualFunds),
    property: asNum(allocationRaw.property ?? allocationRaw.real_estate ?? allocationRaw.realEstate),
    commodity: asNum(allocationRaw.commodity),
  };

  const realEstate = {
    properties,
    totalValue: asNum(realEstateRaw.total_value ?? realEstateRaw.totalValue),
    monthlyRent: asNum(realEstateRaw.monthly_rent ?? realEstateRaw.monthlyRent),
    occupied,
    occupancyPct,
    leaseExpiry: asNum(realEstateRaw.lease_expiry ?? realEstateRaw.leaseExpiry),
    rentalYieldPct: asNum(realEstateRaw.rental_yield_pct ?? realEstateRaw.rentalYieldPct),
    overdueRent: asNum(realEstateRaw.overdue_rent ?? realEstateRaw.overdueRent),
    dueSoonRent: asNum(realEstateRaw.due_soon_rent ?? realEstateRaw.dueSoonRent),
  };

  const executive = {
    totalValue: summary.total_value,
    totalInvested: summary.total_invested,
    totalReturn: summary.total_return,
    returnPct: summary.return_percentage,
    monthlyIncome: summary.monthly_income,
    netWorth: summary.net_worth,
    riskState: normalizeRiskState(riskRaw.risk_state ?? riskRaw.state ?? riskRaw.level),
  };

  return {
    summary,
    portfolio: portfolioRaw,
    allocation,
    risk: riskRaw,
    insights: insightsRaw,
    assets,
    properties,
    transactions,
    typedAlerts,
    activityFeed,
    priorityActions,
    recommendations,
    realEstate,
    executive,
    degradedState: null,
  };
}

function mergeAssetsMePayload(base: PortfolioOperatingData, payloadValue: unknown): PortfolioOperatingData {
  const payload = unwrapPayload(payloadValue);
  const fallbackAssets = asArray<Asset>(payload.assets);
  const fallbackSummary = asRecord(payload.summary);
  const fallbackAllocation = asRecord(payload.allocation);

  const assets = fallbackAssets.length > 0 ? fallbackAssets : base.assets;
  const properties = base.properties.length > 0 ? base.properties : assets.filter((asset) => asset?.type === "property");

  const summary = {
    total_value: base.summary.total_value || asNum(fallbackSummary.total_value),
    total_invested: base.summary.total_invested || asNum(fallbackSummary.total_invested),
    total_return: base.summary.total_return || asNum(fallbackSummary.total_return),
    return_percentage: base.summary.return_percentage || asNum(fallbackSummary.return_percentage),
    monthly_income: base.summary.monthly_income,
    net_worth: base.summary.net_worth || asNum(fallbackSummary.total_value),
  };

  const allocation = {
    stock: base.allocation.stock || asNum(fallbackAllocation.stock ?? fallbackAllocation.equity),
    mf: base.allocation.mf || asNum(fallbackAllocation.mf ?? fallbackAllocation.mutual_funds),
    property: base.allocation.property || asNum(fallbackAllocation.property ?? fallbackAllocation.real_estate),
    commodity: base.allocation.commodity || asNum(fallbackAllocation.commodity),
  };

  return {
    ...base,
    assets,
    properties,
    summary,
    allocation,
    executive: {
      ...base.executive,
      totalValue: summary.total_value,
      totalInvested: summary.total_invested,
      totalReturn: summary.total_return,
      returnPct: summary.return_percentage,
      netWorth: base.executive.netWorth || summary.net_worth,
    },
  };
}

export async function fetchPortfolioGraph(signal?: AbortSignal): Promise<PortfolioOperatingData> {
  const [dashboardResult, assetsResult] = await Promise.allSettled([
    fetcher<unknown>("/dashboard/full", { raw: true, signal }),
    fetcher<unknown>("/assets/me", { raw: true, signal }),
  ]);

  if (dashboardResult.status === "rejected" && assetsResult.status === "rejected") {
    throw dashboardResult.reason;
  }

  let data = EMPTY_PORTFOLIO_OPERATING_DATA;
  const degraded: string[] = [];

  if (dashboardResult.status === "fulfilled") {
    data = normalizeDashboardFullPayload(dashboardResult.value);
  } else {
    degraded.push("dashboard intelligence unavailable");
  }

  if (assetsResult.status === "fulfilled") {
    data = mergeAssetsMePayload(data, assetsResult.value);
  } else {
    degraded.push("assets snapshot unavailable");
  }

  return {
    ...data,
    degradedState: degraded.length > 0 ? `Partial portfolio data: ${degraded.join(", ")}.` : null,
  };
}
