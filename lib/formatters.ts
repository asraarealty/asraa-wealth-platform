/**
 * Shared financial formatting utilities used across dashboard components.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Formats a number as Indian Rupees (₹).
 * Safely handles null/undefined — returns "₹0" instead of throwing.
 */
export function fmtCurrency(n: number | null | undefined): string {
  return INR_FORMATTER.format(n ?? 0);
}

/** Alias for fmtCurrency — formats a numeric value as Indian Rupees (₹). */
export const formatINR = fmtCurrency;

export function fmtPercent(n: number, showSign = false): string {
  const sign = showSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
