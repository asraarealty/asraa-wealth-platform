import type { Asset as ApiAsset } from "@/lib/api";
import type { Asset as DashboardAsset } from "@/lib/types/assets";

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
  allocationPercent?: number;
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
      n(read(asset, "current_price", "currentPrice", "nav"), purchasePrice)
    )
  );

  const investedValue = round2(
    n(
      options.investedValue,
      n(read(asset, "invested_value", "investedValue"), 0)
    )
  );
  const currentValue = round2(
    n(
      options.currentValue,
      n(
        read(asset, "current_value", "currentValue", "value"),
        0
      )
    )
  );

  const profitLoss = round2(
    n(
      options.profitLoss,
      n(read(asset, "profit_loss", "profitLoss", "unrealized_pnl", "unrealizedPnl", "gain_loss", "gainLoss"), 0)
    )
  );
  const explicitReturnRaw = options.returnPercent ?? read(asset, "return_percentage", "returnPercent", "return_percent");
  const returnPercent = round2(n(explicitReturnRaw, 0));
  const allocationPercentRaw =
    options.allocationPercent ?? read(asset, "allocation_percent", "allocationPercent", "allocation");
  const allocationPercent = allocationPercentRaw === undefined || allocationPercentRaw === null ? undefined : round2(n(allocationPercentRaw, 0));
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
