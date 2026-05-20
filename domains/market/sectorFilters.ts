/**
 * Shared sector/theme chip filter definitions used by market surfaces.
 * Centralised here to keep MarketsPulse, DiscoverEngine, and future surfaces in sync.
 */

export const MARKET_SECTOR_CHIPS = [
  "All",
  "Tech",
  "Banking",
  "Pharma",
  "Energy",
  "Metals",
  "Defense",
  "India Growth",
  "Global Tech",
] as const;

export type MarketSectorChip = (typeof MARKET_SECTOR_CHIPS)[number];

/** Keyword lists used to match asset sector/category strings against each chip. */
export const SECTOR_CHIP_KEYWORDS: Record<
  Exclude<MarketSectorChip, "All" | "India Growth" | "Global Tech">,
  string[]
> = {
  Tech: ["technology", "communication", "ai", "software"],
  Banking: ["financials", "banking", "finance"],
  Pharma: ["healthcare", "pharma", "biotech"],
  Energy: ["energy", "oil", "gas", "power"],
  Metals: ["metals", "metal", "mining", "precious metal"],
  Defense: ["defense", "aerospace", "industrials"],
};
