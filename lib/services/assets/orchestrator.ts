import type { Asset as DashboardAsset } from "@/lib/types/assets";
import type { Asset as AdminAsset } from "@/lib/api";

type Asset = DashboardAsset | AdminAsset;

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

function read(asset: Asset, ...keys: string[]) {
  const record = asset as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
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
      ? n(read(asset, "units", "quantity"), 0)
      : type === "property"
      ? 1
      : n(asset.quantity, 0);

  const avgPrice =
    type === "property"
      ? n(read(asset, "purchase_price", "purchasePrice"), 0)
      : type === "mf"
      ? n(read(asset, "nav", "avg_price", "avgPrice"), 0)
      : n(read(asset, "avg_price", "avgPrice"), 0);

  const currentPrice =
    type === "property"
      ? n(read(asset, "current_value", "currentValue"), 0)
      : type === "mf"
      ? n(read(asset, "nav", "current_price", "currentPrice", "avg_price", "avgPrice"), 0)
      : n(read(asset, "current_price", "currentPrice", "avg_price", "avgPrice"), 0);

  const investedValue =
    type === "property" ? n(read(asset, "purchase_price", "purchasePrice"), 0) : units * avgPrice;

  const fallbackValue =
    n(read(asset, "value"), 0) ||
    (type === "property" ? n(read(asset, "current_value", "currentValue"), 0) : units * currentPrice);

  return {
    id: n(asset.id, 0),
    type,
    name: asset.name || (read(asset, "symbol") as string | undefined) || "Unnamed asset",
    symbol: (read(asset, "symbol") as string | undefined) || asset.name || String(asset.id),
    units,
    avgPrice,
    currentPrice,
    investedValue,
    fallbackValue,
    monthlyIncome: type === "property" ? n(read(asset, "rent_amount", "rentAmount"), 0) : 0,
    raw: asset,
  };
}

export function createCanonicalAssetUniverse(
  assets: Asset[]
): CanonicalAssetHolding[] {
  return (Array.isArray(assets) ? assets : []).map(toCanonicalAssetHolding);
}

