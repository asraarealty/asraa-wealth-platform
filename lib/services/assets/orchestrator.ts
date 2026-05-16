import type { Asset } from "@/lib/types/assets";

export type CanonicalAssetType = "stock" | "mf" | "property" | "commodity";

export interface CanonicalAssetHolding {
  id: number;
  type: CanonicalAssetType;
  name: string;
  symbol: string;
  units: number;
  avgPrice: number;
  currentPrice: number;
  investedValue: number;
  fallbackValue: number;
  monthlyIncome: number;
  raw: Asset;
}

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeType(type: string | undefined | null): CanonicalAssetType {
  const t = String(type ?? "").toLowerCase();
  if (t === "real_estate") return "property";
  if (t === "mutual_fund") return "mf";
  if (t === "commodity") return "commodity";
  if (t === "property") return "property";
  if (t === "mf") return "mf";
  return "stock";
}

export function toCanonicalAssetHolding(asset: Asset): CanonicalAssetHolding {
  const type = normalizeType(asset.type);
  const units =
    type === "mf"
      ? n(asset.units ?? asset.quantity, 0)
      : type === "property"
      ? 1
      : n(asset.quantity, 0);

  const avgPrice =
    type === "property"
      ? n(asset.purchase_price, 0)
      : type === "mf"
      ? n(asset.nav ?? asset.avg_price, 0)
      : n(asset.avg_price, 0);

  const currentPrice =
    type === "property"
      ? n(asset.current_value, 0)
      : type === "mf"
      ? n(asset.nav ?? asset.current_price ?? asset.avg_price, 0)
      : n(asset.current_price ?? asset.avg_price, 0);

  const investedValue =
    type === "property" ? n(asset.purchase_price, 0) : units * avgPrice;

  const fallbackValue =
    n(asset.value, 0) ||
    (type === "property" ? n(asset.current_value, 0) : units * currentPrice);

  return {
    id: n(asset.id, 0),
    type,
    name: asset.name || asset.symbol || "Unnamed asset",
    symbol: asset.symbol || asset.name || String(asset.id),
    units,
    avgPrice,
    currentPrice,
    investedValue,
    fallbackValue,
    monthlyIncome: type === "property" ? n(asset.rent_amount, 0) : 0,
    raw: asset,
  };
}

export function createCanonicalAssetUniverse(
  assets: Asset[]
): CanonicalAssetHolding[] {
  return (Array.isArray(assets) ? assets : []).map(toCanonicalAssetHolding);
}

