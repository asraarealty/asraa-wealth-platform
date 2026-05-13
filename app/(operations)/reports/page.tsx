"use client";

import Loader from "@/components/ui/Loader";
import SimpleBarChart from "@/components/properties/SimpleBarChart";
import RealEstateCategorySwitcher from "@/components/properties/RealEstateCategorySwitcher";
import { useEnterpriseReports } from "@/lib/hooks/useEnterpriseReports";
import { useRealEstateCategory } from "@/hooks/useRealEstateCategory";
import { fmtCurrency } from "@/lib/formatters";

function metric(label: string, value: string) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4">
      <p className="text-xs uppercase tracking-widest text-white/45 font-semibold">{label}</p>
      <p className="text-lg text-white font-bold mt-1">{value}</p>
    </div>
  );
}

function fmtPct(value: number | null): string {
  if (value === null) return "0.00%";
  return `${value.toFixed(2)}%`;
}

export default function OperationsReportsPage() {
  const { category, setCategory } = useRealEstateCategory();
  const { data, loading, error, refresh } = useEnterpriseReports({ category });

  if (loading && !data) return <Loader />;

  if (!data) {
    return (
      <div className="glass-card rounded-2xl border border-white/10 p-5">
        <p className="text-white/70">{error ?? "Unable to load reports."}</p>
        <button type="button" onClick={refresh} className="mt-3 text-sm text-cyan-300 font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const totalExpiringLeases = data.realEstate.leaseExpiring + data.realEstate.leaseExpired;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl text-white font-semibold">Operations Reports</h2>
          <p className="text-sm text-white/45">Live occupancy, yield, rent, lease, maintenance and cashflow intelligence</p>
        </div>
        <RealEstateCategorySwitcher value={category} onChange={setCategory} />
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metric("Occupancy analytics", fmtPct(data.occupancyPct))}
        {metric("Rent collection trends", fmtCurrency(data.realEstate.rentCollected ?? 0))}
        {metric("Lease expiry calendar", String(totalExpiringLeases))}
        {metric("Cashflow analysis", fmtCurrency(data.noi ?? 0))}
        {metric("NOI performance", fmtCurrency(data.noi ?? 0))}
        {metric("ROI / Yield", fmtPct(data.rentalYieldPct))}
        {metric("Maintenance cost tracking", fmtCurrency(data.realEstate.maintenanceCosts ?? 0))}
        {metric("Tenant aging analysis", String(data.realEstate.tenants))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SimpleBarChart title="Occupancy analytics" points={data.occupancyHeatmap.map((item) => ({ label: item.label, value: item.occupancyPct }))} />
        <SimpleBarChart title="Rent collection trends" points={data.cashflowSeries} />
        <SimpleBarChart title="Lease expiry calendar" points={[
          { label: "Expiring", value: data.realEstate.leaseExpiring },
          { label: "Expired", value: data.realEstate.leaseExpired },
          { label: "Total", value: totalExpiringLeases },
        ]} />
        <SimpleBarChart title="NOI performance" points={data.performanceSeries} />
      </div>
    </div>
  );
}
