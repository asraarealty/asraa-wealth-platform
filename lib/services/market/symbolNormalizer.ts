export function normalizeMarketSymbol(symbol: string | null | undefined): string {
  const raw = String(symbol ?? "").trim().toUpperCase();
  if (!raw) return "";
  const [base] = raw.split(".");
  return base?.trim() || raw;
}
