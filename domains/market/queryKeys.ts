export const marketQueryKeys = {
  graph: ["market", "graph"] as const,
  search: (query: string) => ["market", "search", query.toLowerCase().trim()] as const,
  watchlist: ["market", "watchlist"] as const,
};
