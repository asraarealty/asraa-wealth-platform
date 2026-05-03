import { PortfolioFull, Asset } from "./api";

export interface Position {
  id: number;
  type: "stock" | "mf" | "property";
  symbol?: string;
  name: string;
  quantity: number;
  avgPrice: number;
  value: number;
  allocation: number;
  location?: string;
  purchasePrice?: number;
  currentValue?: number;
  rentAmount?: number;
  tags: string[];
}

export interface PortfolioData {
  positions: Position[];
  totalValue: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  roiPercent: number;
  allocation: {
    stock: number;
    mf: number;
    realEstate: number;
  };
}

export function mapPortfolioResponse(raw: PortfolioFull): PortfolioData {
  const positions: Position[] = (raw.positions || []).map((p: any) => ({
    id: p.id,
    type: p.type === "real_estate" ? "property" : p.type,
    symbol: p.symbol,
    name: p.name,
    quantity: p.quantity || 0,
    avgPrice: p.avg_price || 0,
    value: p.value || 0,
    allocation: p.allocation || 0,
    location: p.location,
    purchasePrice: p.purchase_price,
    currentValue: p.current_value,
    rentAmount: p.rent_amount,
    tags: p.tags || [],
  }));

  const total = raw.total_value || 1; // avoid div by zero

  return {
    positions,
    totalValue: raw.total_value || 0,
    stockValue: raw.stock_value || 0,
    mfValue: raw.mf_value || 0,
    propertyValue: raw.property_value || 0,
    roiPercent: raw.roi_percent || 0,
    allocation: {
      stock: parseFloat(((raw.stock_value / total) * 100).toFixed(1)),
      mf: parseFloat(((raw.mf_value / total) * 100).toFixed(1)),
      realEstate: parseFloat(((raw.property_value / total) * 100).toFixed(1)),
    },
  };
}