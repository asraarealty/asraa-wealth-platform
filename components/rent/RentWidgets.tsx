import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { RentSummary } from "@/lib/types/realEstate";
import KpiCard from "@/components/properties/KpiCard";

export default function RentWidgets({ summary }: { summary: RentSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <KpiCard label="Rent Collected" value={fmtCurrency(summary.rentCollected)} hint="Current month" />
      <KpiCard label="Pending Rent" value={fmtCurrency(summary.pendingRent)} hint="Awaiting collection" />
      <KpiCard label="Overdue Rent" value={fmtCurrency(summary.overdueRent)} hint="Immediate follow-up" />
      <KpiCard label="Occupancy %" value={fmtPercent(summary.occupancyPercent)} hint="Operational occupancy" />
      <KpiCard label="Yield %" value={fmtPercent(summary.yieldPercent)} hint="Portfolio rental yield" />
      <KpiCard label="NOI" value={fmtCurrency(summary.noi)} hint="Net operating income" />
    </div>
  );
}
