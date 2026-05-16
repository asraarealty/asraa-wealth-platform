import { fetchStockQuote, searchMutualFunds } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";
import type { CanonicalAssetHolding } from "@/lib/services/assets";

export interface MarketPricePoint {
  price: number;
  source: "stock-realtime" | "mf-nav-daily" | "commodity-live" | "property-static";
  asOf: string;
}

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function commodityPriceFromPayload(payload: any): number {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : payload?.results && Array.isArray(payload.results)
    ? payload.results
    : payload
    ? [payload]
    : [];

  for (const item of candidates) {
    const price = n(
      item?.current_price ?? item?.price ?? item?.ltp ?? item?.last_price,
      NaN
    );
    if (Number.isFinite(price) && price > 0) return price;
  }
  return 0;
}

export async function resolveLivePrices(
  holdings: CanonicalAssetHolding[]
): Promise<Record<number, MarketPricePoint>> {
  const byId: Record<number, MarketPricePoint> = {};
  const jobs = holdings.map(async (holding) => {
    const asOf = new Date().toISOString();
    try {
      if (holding.type === "stock" && holding.symbol) {
        const quote = await fetchStockQuote(holding.symbol);
        const price = n(quote?.price, 0);
        if (price > 0) {
          byId[holding.id] = { price, source: "stock-realtime", asOf };
          return;
        }
      }

      if (holding.type === "mf") {
        const results = await searchMutualFunds(holding.symbol || holding.name);
        const exact =
          results.find((r) => r.code === holding.symbol) ??
          results.find((r) => r.name === holding.name) ??
          results[0];
        const price = n(exact?.nav, 0);
        if (price > 0) {
          byId[holding.id] = { price, source: "mf-nav-daily", asOf };
          return;
        }
      }

      if (holding.type === "commodity") {
        const payload = await fetcher<any>(
          `/commodities/search?q=${encodeURIComponent(holding.symbol || holding.name)}`,
          { raw: true, noRedirectOn401: true }
        );
        const price = commodityPriceFromPayload(payload);
        if (price > 0) {
          byId[holding.id] = { price, source: "commodity-live", asOf };
          return;
        }
      }

      if (holding.type === "property") {
        const price = n(
          holding.raw.current_value ?? holding.currentPrice ?? holding.fallbackValue,
          0
        );
        byId[holding.id] = { price, source: "property-static", asOf };
      }
    } catch {
      // fallback handled by valuation engine
    }
  });

  await Promise.all(jobs);
  return byId;
}

