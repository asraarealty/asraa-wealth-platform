export type RiskLevel = "Low" | "Medium" | "High";
export type SuggestedAction = "Rebalance" | "Hold" | "Diversify";

export interface EnterpriseSeriesPoint {
  label: string;
  value: number;
}

export interface OccupancyHeatmapPoint {
  label: string;
  occupancyPct: number;
  status: "fully_occupied" | "partially_occupied" | "vacant" | "unknown";
}

export interface EnterpriseClientReport {
  clientId: number;
  name: string;
  email: string;
  status: "active" | "inactive" | "suspended" | "archived";
  isActive: boolean;
  holdings: number;
  transactions: number;
  totalInvested: number;
  portfolioValue: number;
  gainsLosses: number;
  returnPercent: number;
  cagr: number | null;
  xirr: number | null;
  riskLevel: RiskLevel;
  riskScore: number;
  diversificationScore: number;
  equityPct: number;
  mfPct: number;
  realEstatePct: number;
  commodityPct: number;
  suggestedAction: SuggestedAction;
  recommendations: string[];
}

export interface EnterpriseReportsData {
  generatedAt: string;
  hasPortfolioData: boolean;
  hasRealEstateData: boolean;
  totalClients: number;
  activeClients: number;
  totalAum: number;
  totalInvested: number;
  totalReturns: number;
  portfolioGrowthPct: number;
  allocationPct: {
    equity: number;
    mf: number;
    realEstate: number;
    commodity: number;
  };
  riskExposureScore: number;
  diversificationScore: number;
  diversificationWarnings: string[];
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  occupancyPct: number | null;
  rentalYieldPct: number | null;
  noi: number | null;
  realEstate: {
    properties: number;
    tenants: number;
    leases: number;
    leaseExpiring: number;
    leaseExpired: number;
    vacantUnits: number;
    rentCollected: number | null;
    pendingRent: number | null;
    overdueRent: number | null;
    maintenanceOpen: number;
    maintenanceInProgress: number;
    maintenanceResolved: number;
    maintenanceCosts: number | null;
  };
  performanceSeries: EnterpriseSeriesPoint[];
  cashflowSeries: EnterpriseSeriesPoint[];
  allocationSeries: EnterpriseSeriesPoint[];
  riskSeries: EnterpriseSeriesPoint[];
  occupancyHeatmap: OccupancyHeatmapPoint[];
  clients: EnterpriseClientReport[];
}
