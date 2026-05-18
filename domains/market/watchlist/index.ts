const WATCHLIST_STORAGE_KEY = "asraa.market.watchlist";
const DEFAULT_WATCHLIST = ["RELIANCE", "INFY", "AAPL", "GOLD", "PPFCF"];

function normalize(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function getWatchlistSymbols(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_WATCHLIST];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [...DEFAULT_WATCHLIST];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_WATCHLIST];
    return [...new Set(parsed.map((item) => normalize(String(item))).filter(Boolean))];
  } catch {
    return [...DEFAULT_WATCHLIST];
  }
}

export function persistWatchlist(symbols: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WATCHLIST_STORAGE_KEY,
    JSON.stringify([...new Set(symbols.map(normalize).filter(Boolean))])
  );
}

export function toggleWatchlistSymbol(symbol: string, current = getWatchlistSymbols()) {
  const normalized = normalize(symbol);
  const next = current.includes(normalized)
    ? current.filter((item) => item !== normalized)
    : [...current, normalized];
  persistWatchlist(next);
  return next;
}

export { WATCHLIST_STORAGE_KEY, DEFAULT_WATCHLIST };
