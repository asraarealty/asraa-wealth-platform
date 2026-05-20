const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(value: unknown): string {
  const parsed = toNumber(value);
  if (parsed === null) return "—";
  return CURRENCY_FORMATTER.format(Number(parsed.toFixed(2)));
}

export function formatPercent(value: unknown): string {
  const parsed = toNumber(value);
  if (parsed === null) return "—";
  return `${parsed.toFixed(2)}%`;
}

export function formatQuantity(value: unknown): string {
  const parsed = toNumber(value);
  if (parsed === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(parsed);
}

export function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return DATE_FORMATTER.format(date);
}
