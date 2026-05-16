export type AssetType = "stock" | "mf" | "property";

export interface Asset {
  id: number;
  user_id: number;
  type: AssetType;
  name: string;
  symbol: string | null;
  quantity: number | null;
  avg_price: number | null;
  value: number;
  tags: string[];
  created_at: string;
  current_price: number | null;
  units: number | null;
  nav: number | null;
  location: string | null;
  purchase_price: number | null;
  current_value: number | null;
  rent_amount: number | null;
  rent_due_date: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_email: string | null;
  rent_received: boolean | null;
  last_paid_date: string | null;
  return_percentage: number;
}

export interface DashboardSummary {
  total_value: number;
  total_invested: number;
  total_return: number;
  return_percentage: number;
}

export interface DashboardAllocation {
  stock: number;
  mf: number;
  property: number;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    summary: DashboardSummary;
    allocation: DashboardAllocation;
    assets: Asset[];
  };
  error: string | null;
}

export interface InsightsResponse {
  equity_percentage: number;
  real_estate_percentage: number;
  alerts: string[];
}
