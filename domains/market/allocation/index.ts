import type { MarketAsset } from "@/domains/market/types";

export function getMarketAllocationOverlay(assets: MarketAsset[]) {
  const counts = {
    India: assets.filter((item) => item.market === "India").length,
    Global: assets.filter((item) => item.market === "Global").length,
    Fund: assets.filter((item) => item.kind === "mutual-fund").length,
    Commodity: assets.filter((item) => item.market === "Commodity").length,
    Macro: assets.filter((item) => item.market === "Macro").length,
  };

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;

  return {
    counts,
    percentages: {
      India: (counts.India / total) * 100,
      Global: (counts.Global / total) * 100,
      Fund: (counts.Fund / total) * 100,
      Commodity: (counts.Commodity / total) * 100,
      Macro: (counts.Macro / total) * 100,
    },
  };
}
