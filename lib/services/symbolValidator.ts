/**
 * Stock symbol validation utilities.
 *
 * Supported formats:
 *   NSE  — symbol ends with ".NS"  (e.g. RELIANCE.NS, TCS.NS)
 *   US   — symbol has no "." suffix (e.g. AAPL, TSLA)
 *
 * Any other pattern (e.g. AAPL.NS, TSLA.L) is considered invalid because
 * it either pairs a US ticker with an Indian exchange suffix or uses an
 * unsupported exchange extension.
 */

export type StockExchange = "NSE" | "US";

export interface SymbolValidationResult {
  valid: boolean;
  exchange: StockExchange | null;
  /** Human-readable error message when valid is false. */
  error?: string;
}

/**
 * Validate a stock symbol and determine its exchange.
 *
 * Rules:
 *   - Ends with ".NS"  → NSE (India, INR)
 *   - No "." at all    → US (USD)
 *   - Anything else    → invalid
 */
export function validateStockSymbol(symbol: string): SymbolValidationResult {
  const s = symbol.trim().toUpperCase();

  if (!s) {
    return { valid: false, exchange: null, error: "Symbol cannot be empty" };
  }

  if (s.endsWith(".NS")) {
    const base = s.slice(0, -3);
    if (!base) {
      return { valid: false, exchange: null, error: "Symbol cannot be just '.NS'" };
    }
    return { valid: true, exchange: "NSE" };
  }

  if (!s.includes(".")) {
    return { valid: true, exchange: "US" };
  }

  // Has a dot but not ".NS" — unsupported exchange suffix
  return {
    valid: false,
    exchange: null,
    error:
      "Invalid symbol format. NSE stocks must end with '.NS' (e.g. RELIANCE.NS). US stocks must have no suffix (e.g. AAPL).",
  };
}

/**
 * Derive the exchange from a (already-validated) symbol string.
 * Returns "NSE" if the symbol ends with ".NS", otherwise "US".
 */
export function getExchangeForSymbol(symbol: string): StockExchange {
  return symbol.trim().toUpperCase().endsWith(".NS") ? "NSE" : "US";
}
