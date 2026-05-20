import type { MarketAssetKind } from "@/domains/market/types";
import type { AssetType } from "@/lib/types/assets";

export interface SearchResultDTO {
  id: string;
  symbol: string;
  name: string;
  kind: MarketAssetKind;
  market: string;
  category: string;
  exchange?: string;
  price?: number;
}

export interface SelectedInstrumentDTO extends SearchResultDTO {}

export interface ValuationDTO {
  currentPrice?: number;
  currentValue?: number;
  unrealizedPnl?: number;
  gainLoss?: number;
  profitLoss?: number;
  returnPercent?: number;
  spotPrice?: number;
  rentalYield?: number;
  appreciation?: number;
  netReturn?: number;
}

export interface HoldingDTO {
  id?: number;
  assetType: AssetType;
  name?: string;
  symbol?: string;
  quantity?: number;
  units?: number;
  purchasePrice?: number;
  purchaseNav?: number;
  purchaseDate?: string;
  folioNumber?: string;
  location?: string;
  currentValuation?: number;
  monthlyRent?: number;
  tenantDetails?: string;
  valuation: ValuationDTO;
}

export interface FormBaseProps {
  mode: "create" | "edit";
  holding: HoldingDTO | null;
  isSubmitting?: boolean;
  error?: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}
