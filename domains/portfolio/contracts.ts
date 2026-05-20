import type { Asset as ApiAsset } from "@/lib/api";
import type { Asset as DashboardAsset } from "@/lib/types/assets";
import { deriveReturnPercent } from "@/lib/finance/returns";

type AnyAsset = ApiAsset | DashboardAsset;

export type PortfolioHolding = {
  id: string;

  assetType:
    | "stock"
    | "mutual_fund"
    | "commodity"
    | "property";

  symbol: string;
  name: string;

  quantity: number;

  purchasePrice: number;
  currentPrice: number;

  investedValue: number;
  currentValue: number;

  profitLoss: number;
  returnPercent: number;

  allocationPercent?: number;

  purchaseDate?: string;
  lastPriceUpdatedAt?: string;
};

interface ToPortfolioHoldingOptions {
  currentPrice?: number;
  currentValue?: number;
  investedValue?: number;
  profitLoss?: number;
  returnPercent?: number;
  totalCurrentValue?: number;
  lastPriceUpdatedAt?: string;
}

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function read(asset: AnyAsset, ...keys: string[]) {
  const record = asset as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function toAssetType(type: unknown): PortfolioHolding["assetType"] {
  const normalized = String(type ?? "").toLowerCase();
  if (normalized === "mf" || normalized === "mutual_fund") return "mutual_fund";
  if (normalized === "commodity") return "commodity";
  if (normalized === "property" || normalized === "real_estate") return "property";
  return "stock";
}

export function toPortfolioHolding(
  asset: AnyAsset,
  options: ToPortfolioHoldingOptions = {}
): PortfolioHolding {
  const assetType = toAssetType(read(asset, "type", "asset_type"));
  const quantity = assetType === "property" ? 1 : n(read(asset, "quantity", "units"), 0);

  const purchasePrice = round2(
    n(
      read(
        asset,
        "purchase_price",
        "purchasePrice",
        "avg_price",
        "avgPrice",
        "nav"
      ),
      0
    )
  );
  const currentPrice = round2(
    n(
      options.currentPrice,
      n(read(asset, "current_price", "currentPrice", "nav", "current_value", "currentValue"), purchasePrice)
    )
  );

  const investedValue = round2(
    n(
      options.investedValue,
      assetType === "property" ? purchasePrice : quantity * purchasePrice
    )
  );
  const currentValue = round2(
    n(
      options.currentValue,
      n(
        read(asset, "current_value", "currentValue", "value"),
        assetType === "property" ? currentPrice : quantity * currentPrice
      )
    )
  );

  const profitLoss = round2(n(options.profitLoss, currentValue - investedValue));
  const explicitReturnPercent = n(options.returnPercent, n(read(asset, "return_percentage", "returnPercent", "return_percent"), Number.NaN));
  const returnPercent = round2(deriveReturnPercent(investedValue, currentValue, explicitReturnPercent));
  const totalCurrentValue = n(options.totalCurrentValue, 0);
  const allocationPercent = totalCurrentValue > 0 ? round2((currentValue * 100) / totalCurrentValue) : undefined;
  const purchaseDate = read(asset, "purchase_date", "purchaseDate");

  return {
    id: String(read(asset, "id") ?? ""),
    assetType,
    symbol: String(read(asset, "symbol") ?? "").trim(),
    name: String(read(asset, "name") ?? read(asset, "symbol") ?? "Unnamed asset"),
    quantity,
    purchasePrice,
    currentPrice,
    investedValue,
    currentValue,
    profitLoss,
    returnPercent,
    allocationPercent,
    purchaseDate: typeof purchaseDate === "string" ? purchaseDate : undefined,
    lastPriceUpdatedAt: options.lastPriceUpdatedAt,
  };
}
