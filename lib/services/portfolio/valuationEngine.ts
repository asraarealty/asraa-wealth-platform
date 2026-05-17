import type { CanonicalAssetHolding, CanonicalAssetType } from "@/lib/services/assets";
import type { MarketPricePoint } from "@/lib/services/market";

export interface HoldingValuation {
  id: number;
  type: CanonicalAssetType;
  livePrice: number;
  liveValue: number;
  investedValue: number;
  unrealizedPnL: number;
}

export interface PortfolioValuation {
  holdings: HoldingValuation[];
  liveValue: number;
  investedValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  monthlyIncome: number;
  netWorth: number;
  allocationPct: Record<CanonicalAssetType, number>;
  exposurePct: Record<CanonicalAssetType, number>;
}

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

function resolveFallbackStockPrice(holding: CanonicalAssetHolding): number {
  const storedBackendPrice = n(holding.currentPrice, 0);
  const avgCost = n(holding.avgPrice, 0);
  const investedPerUnit = holding.units > 0.001 ? n(holding.investedValue / holding.units, 0) : 0;
  const investedValuePrice = investedPerUnit > 0 && investedPerUnit < 10_000_000
    ? investedPerUnit
    : n(holding.investedValue, 0);

  return storedBackendPrice || avgCost || investedValuePrice;
}

export function computePortfolioValuation(
  holdings: CanonicalAssetHolding[],
  livePriceMap: Record<number, MarketPricePoint>
): PortfolioValuation {
  const valuations: HoldingValuation[] = holdings.map((holding) => {
    const liveMarketPrice = n(livePriceMap[holding.id]?.price, 0);
    const fallbackStockPrice = resolveFallbackStockPrice(holding);
    const fallbackGenericPrice = n(holding.currentPrice, n(holding.avgPrice, fallbackStockPrice));
    const livePrice = holding.type === "stock"
      ? n(liveMarketPrice, fallbackStockPrice)
      : n(liveMarketPrice, fallbackGenericPrice);

    const computedLiveValue =
      holding.type === "property"
        ? n(holding.raw.current_value, n(holding.fallbackValue, livePrice))
        : livePrice * n(holding.units, 0);

    const investedValue = n(holding.investedValue, 0);
    const liveValue = n(computedLiveValue, n(holding.fallbackValue, investedValue));

    return {
      id: holding.id,
      type: holding.type,
      livePrice,
      liveValue,
      investedValue,
      unrealizedPnL: liveValue - investedValue,
    };
  });

  const liveValue = valuations.reduce((sum, v) => sum + n(v.liveValue, 0), 0);
  const investedValue = valuations.reduce(
    (sum, v) => sum + n(v.investedValue, 0),
    0
  );
  const unrealizedPnL = liveValue - investedValue;
  const monthlyIncome = holdings.reduce(
    (sum, h) => sum + n(h.monthlyIncome, 0),
    0
  );
  const netWorth = liveValue;

  const byType: Record<CanonicalAssetType, number> = {
    stock: 0,
    mf: 0,
    property: 0,
    commodity: 0,
  };

  for (const v of valuations) byType[v.type] += n(v.liveValue, 0);

  const allocationPct: Record<CanonicalAssetType, number> = {
    stock: pct(byType.stock, liveValue),
    mf: pct(byType.mf, liveValue),
    property: pct(byType.property, liveValue),
    commodity: pct(byType.commodity, liveValue),
  };

  return {
    holdings: valuations,
    liveValue,
    investedValue,
    unrealizedPnL,
    unrealizedPnLPct: pct(unrealizedPnL, investedValue),
    monthlyIncome,
    netWorth,
    allocationPct,
    exposurePct: allocationPct,
  };
}
