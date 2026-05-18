"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import type { Asset } from "@/lib/types/assets";
import type { Transaction } from "@/lib/api";

type EventType = "risk" | "cashflow" | "rent" | "drift" | "opportunity";

export interface EventItem {
  id: string;
  type: EventType;
  title: string;
  message: string;
  timestamp: string;
}

interface PriorityAction {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
}

interface RiskSignal {
  label?: string;
  level?: string;
  score?: number;
  days?: number | null;
}

interface RiskPriorityAction {
  id?: string;
  title?: string;
  description?: string;
  message?: string;
  severity?: string;
}

export interface DashboardRisk {
  risk_state?: string;
  state?: string;
  level?: string;
  concentration?: RiskSignal;
  diversification?: RiskSignal;
  inactivity?: RiskSignal;
  priority_actions?: RiskPriorityAction[];
  priorityActions?: RiskPriorityAction[];
  [key: string]: unknown;
}

interface DashboardSummary {
  total_value: number;
  total_invested: number;
  total_return: number;
  return_percentage: number;
  monthly_income: number;
  net_worth: number;
}

interface DashboardAllocation {
  stock: number;
  mf: number;
  property: number;
  commodity: number;
}

interface DashboardRealEstate {
  properties: Asset[];
  totalValue: number;
  monthlyRent: number;
  occupied: number;
  occupancyPct: number;
  leaseExpiry: number;
  rentalYieldPct: number;
  overdueRent: number;
  dueSoonRent: number;
}

interface DashboardExecutive {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnPct: number;
  monthlyIncome: number;
  netWorth: number;
  riskState: "Low" | "Medium" | "High";
}

export interface DashboardOperatingData {
  summary: DashboardSummary;
  portfolio: Record<string, unknown>;
  allocation: DashboardAllocation;
  risk: DashboardRisk;
  insights: Array<Record<string, unknown> | string>;
  assets: Asset[];
  properties: Asset[];
  transactions: Transaction[];
  typedAlerts: EventItem[];
  activityFeed: EventItem[];
  priorityActions: PriorityAction[];
  recommendations: Recommendation[];
  realEstate: DashboardRealEstate;
  executive: DashboardExecutive;
}

interface DashboardContextValue {
  data: DashboardOperatingData;
  isLoading: boolean;
  isError: boolean;
  marketSyncNotice: string | null;
  refetchAll: () => void;
}

const EMPTY_DATA: DashboardOperatingData = {
  summary: {
    total_value: 0,
    total_invested: 0,
    total_return: 0,
    return_percentage: 0,
    monthly_income: 0,
    net_worth: 0,
  },
  portfolio: {},
  allocation: { stock: 0, mf: 0, property: 0, commodity: 0 },
  risk: {},
  insights: [],
  assets: [],
  properties: [],
  transactions: [],
  typedAlerts: [],
  activityFeed: [],
  priorityActions: [],
  recommendations: [],
  realEstate: {
    properties: [],
    totalValue: 0,
    monthlyRent: 0,
    occupied: 0,
    occupancyPct: 0,
    leaseExpiry: 0,
    rentalYieldPct: 0,
    overdueRent: 0,
    dueSoonRent: 0,
  },
  executive: {
    totalValue: 0,
    totalInvested: 0,
    totalReturn: 0,
    returnPct: 0,
    monthlyIncome: 0,
    netWorth: 0,
    riskState: "Low",
  },
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

const asNum = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asStr = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

const asArray = <T,>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : [];
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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

async function fetchDashboardFull(): Promise<DashboardOperatingData> {
  const res = await fetcher<unknown>("/dashboard/full", { raw: true });
  const root = asRecord(res);
  const payload = asRecord(root.data ?? root);

  const summaryRaw = asRecord(payload.summary);
  const portfolioRaw = asRecord(payload.portfolio);
  const allocationRaw = asRecord(payload.allocation);
  const intelligenceRaw = asRecord(payload.intelligence);
  const riskRaw = asRecord(payload.risk ?? intelligenceRaw.risk) as DashboardRisk;
  const insightsRaw = asArray<Record<string, unknown> | string>(
    payload.insights ?? intelligenceRaw.alerts
  );
  const recommendationsRaw = asArray<Record<string, unknown>>(payload.recommendations);
  const activityRaw = asArray<Record<string, unknown>>(payload.activity_feed ?? payload.activityFeed);

  const assets = asArray<Asset>(
    portfolioRaw.assets ?? portfolioRaw.holdings ?? portfolioRaw.positions
  );
  const properties = asArray<Asset>(portfolioRaw.properties).length > 0
    ? asArray<Asset>(portfolioRaw.properties)
    : assets.filter((asset) => asset?.type === "property");
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
    const type = classifyAlertType(alert?.type ?? title);
    return {
      id: asStr(alert?.id, `insight-${index}`),
      type,
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

  const priorityActionsRaw = asArray<RiskPriorityAction>(
    riskRaw.priority_actions ?? riskRaw.priorityActions
  );
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

  const summary: DashboardSummary = {
    total_value: asNum(summaryRaw.total_value ?? summaryRaw.totalValue),
    total_invested: asNum(summaryRaw.total_invested ?? summaryRaw.totalInvested),
    total_return: asNum(summaryRaw.total_return ?? summaryRaw.totalReturn),
    return_percentage: asNum(summaryRaw.return_percentage ?? summaryRaw.returnPercentage),
    monthly_income: asNum(summaryRaw.monthly_income ?? summaryRaw.monthlyIncome),
    net_worth: asNum(summaryRaw.net_worth ?? summaryRaw.netWorth),
  };

  const allocation: DashboardAllocation = {
    stock: asNum(allocationRaw.stock ?? allocationRaw.equity),
    mf: asNum(allocationRaw.mf ?? allocationRaw.mutual_funds ?? allocationRaw.mutualFunds),
    property: asNum(allocationRaw.property ?? allocationRaw.real_estate ?? allocationRaw.realEstate),
    commodity: asNum(allocationRaw.commodity),
  };

  const realEstate: DashboardRealEstate = {
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

  const executive: DashboardExecutive = {
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
  };
}

export const DASHBOARD_FULL_KEY = ["dashboard-full"] as const;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: DASHBOARD_FULL_KEY,
    queryFn: fetchDashboardFull,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });

  const refetchAll = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const value: DashboardContextValue = useMemo(() => ({
    data: query.data ?? EMPTY_DATA,
    isLoading: query.isLoading,
    isError: query.isError,
    marketSyncNotice: null,
    refetchAll,
  }), [query.data, query.isError, query.isLoading, refetchAll]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardData(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardData must be used within DashboardProvider");
  return ctx;
}
