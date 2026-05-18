import type { Asset } from "@/lib/api";
import type { EnrichedClient } from "@/lib/hooks/useAdminClients";
import type { CanonicalAssetHolding } from "@/lib/services/assets";

export type PortfolioSearchBy =
  | "all"
  | "client"
  | "asset"
  | "stock-symbol"
  | "mutual-fund"
  | "commodity";

export type AssetClassFilter = "all" | "stock" | "mf" | "commodity" | "property";

export type LifecycleFilter =
  | "all"
  | "lead"
  | "onboarding"
  | "pending_kyc"
  | "approved"
  | "active"
  | "suspended"
  | "archived";

export interface PortfolioWorkspaceFilters {
  query: string;
  searchBy: PortfolioSearchBy;
  assetClass: AssetClassFilter;
  lifecycle: LifecycleFilter;
}

export interface ClientHoldingRow {
  key: string;
  pricingId: number;
  client: EnrichedClient;
  asset: Asset;
  canonical: CanonicalAssetHolding;
}
