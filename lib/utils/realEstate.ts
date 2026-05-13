export function toTitleLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function calculateRoiPercent(purchaseValue: number, currentValue: number): number {
  if (purchaseValue <= 0) return 0;
  return ((currentValue - purchaseValue) / purchaseValue) * 100;
}

export function leaseCountdownDays(endDate: string, currentTimestamp = Date.now()): number {
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.ceil((end - currentTimestamp) / (1000 * 60 * 60 * 24));
}
