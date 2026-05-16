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

export function computePortfolioValuation(
  holdings: CanonicalAssetHolding[],
  livePriceMap: Record<number, MarketPricePoint>
): PortfolioValuation {
  const valuations: HoldingValuation[] = holdings.map((holding) => {
    const livePrice = n(
      livePriceMap[holding.id]?.price,
      n(holding.currentPrice, holding.avgPrice)
    );

    const liveValue =
      holding.type === "property"
        ? n(holding.raw.current_value, n(holding.fallbackValue, livePrice))
        : livePrice * n(holding.units, 0);

    const investedValue = n(holding.investedValue, 0);

    return {
      id: holding.id,
      type: holding.type,
      livePrice,
      liveValue: n(liveValue, n(holding.fallbackValue, 0)),
      investedValue,
      unrealizedPnL: n(liveValue, 0) - investedValue,
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

