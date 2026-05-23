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
  if (!Number.isFinite(n)) return "—";
  const sign = showSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Formats a nullable ISO timestamp string as "HH:MM UTC".
 * Returns null when the value is absent or not a valid date.
 */
export function fmtLastUpdated(value: string | null | undefined): string | null {
  if (!value) return null;
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toISOString().slice(11, 16) + " UTC";
}
