import type { Asset } from "@/lib/types/assets";
import type { Transaction } from "@/lib/api";

export type EventType = "risk" | "cashflow" | "rent" | "drift" | "opportunity";

export interface EventItem {
  id: string;
  type: EventType;
  title: string;
  message: string;
  timestamp: string;
}

export interface DashboardRisk {
  risk_state?: string;
  state?: string;
  level?: string;
  concentration?: { label?: string; level?: string; score?: number; days?: number | null };
  diversification?: { label?: string; level?: string; score?: number; days?: number | null };
  inactivity?: { label?: string; level?: string; score?: number; days?: number | null };
  priority_actions?: Array<{ id?: string; title?: string; description?: string; message?: string; severity?: string }>;
  priorityActions?: Array<{ id?: string; title?: string; description?: string; message?: string; severity?: string }>;
  [key: string]: unknown;
}

export interface DashboardSummary {
  total_value: number;
  total_invested: number;
  total_return: number;
  return_percentage: number;
  monthly_income: number;
  net_worth: number;
}

export interface DashboardAllocation {
  stock: number;
  mf: number;
  property: number;
  commodity: number;
}

export interface DashboardRealEstate {
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

export interface DashboardExecutive {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnPct: number;
  monthlyIncome: number;
  netWorth: number;
  riskState: "Low" | "Medium" | "High";
}

export interface PriorityAction {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
}

export interface FeaturedProperty {
  id: string;
  title: string;
  location: string;
  tagline: string;
  imageUrl: string | null;
  href: string | null;
}

export interface PortfolioOperatingData {
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
  featuredProperties: FeaturedProperty[];
  realEstate: DashboardRealEstate;
  executive: DashboardExecutive;
  degradedState: string | null;
}

export const EMPTY_PORTFOLIO_OPERATING_DATA: PortfolioOperatingData = {
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
  featuredProperties: [],
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
  degradedState: null,
};
