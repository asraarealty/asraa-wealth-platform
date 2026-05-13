import type { OwnerAnalytics } from "@/lib/types/realEstate";
import SimpleBarChart from "@/components/properties/SimpleBarChart";

export default function MonthlySummaryChart({ analytics }: { analytics: OwnerAnalytics }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SimpleBarChart title="Rent Trend" points={analytics.rentTrend} />
      <SimpleBarChart title="Cashflow Forecast" points={analytics.cashflowForecast} />
    </div>
  );
}
