export function deriveReturnPercent(
  investedValue: number,
  currentValue: number,
  explicitReturnPercent?: number
): number {
  if (Number.isFinite(explicitReturnPercent)) return Number(explicitReturnPercent);
  if (!Number.isFinite(investedValue) || investedValue <= 0) return 0;
  if (!Number.isFinite(currentValue)) return 0;
  return ((currentValue - investedValue) / investedValue) * 100;
}
