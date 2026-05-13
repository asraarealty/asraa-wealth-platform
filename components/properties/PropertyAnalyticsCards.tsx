import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { PropertySummary } from "@/lib/types/realEstate";
import KpiCard from "./KpiCard";

export default function PropertyAnalyticsCards({ properties }: { properties: PropertySummary[] }) {
  const totalValue = properties.reduce((sum, item) => sum + item.currentValue, 0);
  const totalPurchase = properties.reduce((sum, item) => sum + item.purchaseValue, 0);
  const avgYield = properties.length
    ? properties.reduce((sum, item) => sum + item.rentalYieldPercent, 0) / properties.length
    : 0;
  const avgRoi = properties.length ? properties.reduce((sum, item) => sum + item.roiPercent, 0) / properties.length : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard label="Portfolio Value" value={fmtCurrency(totalValue)} hint={`${properties.length} managed properties`} />
      <KpiCard label="Capital Deployed" value={fmtCurrency(totalPurchase)} hint="Acquisition basis" />
      <KpiCard label="Avg Rental Yield" value={fmtPercent(avgYield)} hint="Operational yield" />
      <KpiCard label="Avg ROI" value={fmtPercent(avgRoi, true)} hint="Value appreciation + rental" />
    </div>
  );
}
