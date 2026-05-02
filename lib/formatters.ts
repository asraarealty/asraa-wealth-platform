/**
 * Shared financial formatting utilities used across dashboard components.
 */

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtPercent(n: number, showSign = false): string {
  const sign = showSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
