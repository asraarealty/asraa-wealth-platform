import type { CanonicalAssetHolding } from "@/lib/services/assets";
import { resolveMarketPricePoints, type MarketPricePoint } from "@/domains/market/quotes";

export type { MarketPricePoint };

export async function resolveLivePrices(
  holdings: CanonicalAssetHolding[]
): Promise<Record<number, MarketPricePoint>> {
  return resolveMarketPricePoints(holdings);
}
