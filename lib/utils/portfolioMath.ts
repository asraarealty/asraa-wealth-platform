export interface AllocationBreakdown {
  stock: number;
  mf: number;
  realEstate: number;
}

function toFinite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampToPositive(value: number): number {
  return value > 0 ? value : 0;
}

export function normalizeAllocationPercentages(input: AllocationBreakdown): AllocationBreakdown {
  const stock = clampToPositive(toFinite(input.stock));
  const mf = clampToPositive(toFinite(input.mf));
  const realEstate = clampToPositive(toFinite(input.realEstate));
  const total = stock + mf + realEstate;

  if (total <= 0) return { stock: 0, mf: 0, realEstate: 0 };

  const raw = [
    (stock / total) * 100,
    (mf / total) * 100,
    (realEstate / total) * 100,
  ];
  const rounded = raw.map((v) => Number(v.toFixed(1)));
  const roundedTotal = rounded[0] + rounded[1] + rounded[2];
  const diff = Number((100 - roundedTotal).toFixed(1));

  const largestIdx = raw.reduce((best, value, idx, arr) =>
    value > arr[best] ? idx : best
  , 0);

  rounded[largestIdx] = Number(Math.max(0, rounded[largestIdx] + diff).toFixed(1));

  return {
    stock: rounded[0],
    mf: rounded[1],
    realEstate: rounded[2],
  };
}

export function deriveAllocationFromValues(values: {
  stockValue?: number;
  mfValue?: number;
  propertyValue?: number;
  totalValue?: number;
}): AllocationBreakdown | undefined {
  const stockValue = clampToPositive(toFinite(values.stockValue));
  const mfValue = clampToPositive(toFinite(values.mfValue));
  const propertyValue = clampToPositive(toFinite(values.propertyValue));

  const computedTotal = stockValue + mfValue + propertyValue;
  const fallbackTotal = clampToPositive(toFinite(values.totalValue));
  const total = computedTotal > 0 ? computedTotal : fallbackTotal;

  if (total <= 0) return undefined;

  return normalizeAllocationPercentages({
    stock: (stockValue / total) * 100,
    mf: (mfValue / total) * 100,
    realEstate: (propertyValue / total) * 100,
  });
}
