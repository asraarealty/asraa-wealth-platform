import { PortfolioFull, Asset, AssetType } from "./api";

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
  const positions: Position[] = (raw.positions || []).map((p: Asset) => ({
    id: p.id,
    type: p.type,
    symbol: p.symbol,
    name: p.name,
    quantity: p.quantity || 0,
    avgPrice: p.avgPrice,
    value: p.value || 0,
    allocation: p.allocation || 0,
    location: p.location,
    purchasePrice: p.purchasePrice,
    currentValue: p.currentValue,
    rentAmount: p.rentAmount,
    tags: p.tags || [],
  }));

  const total = raw.totalValue || 1; // avoid div by zero

  return {
    positions,
    totalValue: raw.totalValue || 0,
    stockValue: raw.stockValue || 0,
    mfValue: raw.mfValue || 0,
    propertyValue: raw.propertyValue || 0,
    roiPercent: raw.roiPercent || 0,
    allocation: {
      stock: parseFloat(((raw.stockValue / total) * 100).toFixed(1)),
      mf: parseFloat(((raw.mfValue / total) * 100).toFixed(1)),
      realEstate: parseFloat(((raw.propertyValue / total) * 100).toFixed(1)),
    },
  };
}