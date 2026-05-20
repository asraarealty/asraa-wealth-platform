export function deriveReturnPercent(
  investedValue: number,
  currentValue: number,
  explicitReturnPercent?: number
): number {
  if (explicitReturnPercent !== undefined && Number.isFinite(explicitReturnPercent)) return explicitReturnPercent;
  if (!Number.isFinite(investedValue) || investedValue <= 0) return 0;
  if (!Number.isFinite(currentValue)) return 0;
  return ((currentValue - investedValue) / investedValue) * 100;
}
