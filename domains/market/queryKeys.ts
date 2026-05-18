export const marketQueryKeys = {
  graph: ["market", "graph"] as const,
  search: (query: string) => ["market", "search", query.toLowerCase().trim()] as const,
  watchlist: ["market", "watchlist"] as const,
  quotes: (symbols: string[]) => ["market", "quotes", [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join("|")] as const,
  breadth: ["market", "breadth"] as const,
  intelligence: ["market", "intelligence"] as const,
};
