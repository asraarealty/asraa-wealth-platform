// Accept signed decimal input; positivity/negativity rules are validated by callers.
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

export function parseDecimalInput(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    if (value === null || value === undefined) return null;
    const coerced = Number(value);
    return Number.isFinite(coerced) ? coerced : null;
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (!DECIMAL_PATTERN.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function safeDecimalNumber(value: unknown, fallback = 0): number {
  const parsed = parseDecimalInput(value);
  return parsed === null ? fallback : parsed;
}
