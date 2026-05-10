export interface AllocationBreakdown {
  stock: number;
  mf: number;
  realEstate: number;
  commodity: number;
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
  const commodity = clampToPositive(toFinite(input.commodity));
  const total = stock + mf + realEstate + commodity;

  if (total <= 0) return { stock: 0, mf: 0, realEstate: 0, commodity: 0 };

  const raw = [
    (stock / total) * 100,
    (mf / total) * 100,
    (realEstate / total) * 100,
    (commodity / total) * 100,
  ];
  const rounded = raw.map((v) => Number(v.toFixed(1)));
  const roundedTotal = rounded.reduce((sum, val) => sum + val, 0);
  const diff = Number((100 - roundedTotal).toFixed(1));

  const largestIdx = raw.reduce((best, value, idx, arr) =>
    value > arr[best] ? idx : best
  , 0);

  rounded[largestIdx] = Number(Math.max(0, rounded[largestIdx] + diff).toFixed(1));

  return {
    stock: rounded[0],
    mf: rounded[1],
    realEstate: rounded[2],
    commodity: rounded[3],
  };
}

export function deriveAllocationFromValues(values: {
  stockValue?: number;
  mfValue?: number;
  propertyValue?: number;
  commodityValue?: number;
  totalValue?: number;
}): AllocationBreakdown | undefined {
  const stockValue = clampToPositive(toFinite(values.stockValue));
  const mfValue = clampToPositive(toFinite(values.mfValue));
  const propertyValue = clampToPositive(toFinite(values.propertyValue));
  const commodityValue = clampToPositive(toFinite(values.commodityValue));

  const computedTotal = stockValue + mfValue + propertyValue + commodityValue;
  const fallbackTotal = clampToPositive(toFinite(values.totalValue));
  const total = computedTotal > 0 ? computedTotal : fallbackTotal;

  if (total <= 0) return undefined;

  return normalizeAllocationPercentages({
    stock: (stockValue / total) * 100,
    mf: (mfValue / total) * 100,
    realEstate: (propertyValue / total) * 100,
    commodity: (commodityValue / total) * 100,
  });
}
