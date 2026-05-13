"use client";

import { useOwnerAnalytics, useRentLedger, useRentSummary } from "@/hooks/useRealEstate";
import { useRealEstateCategory } from "@/hooks/useRealEstateCategory";
import RentWidgets from "@/components/rent/RentWidgets";
import RentLedgerTable from "@/components/rent/RentLedgerTable";
import MonthlySummaryChart from "@/components/rent/MonthlySummaryChart";
import SimpleBarChart from "@/components/properties/SimpleBarChart";
import RealEstateCategorySwitcher from "@/components/properties/RealEstateCategorySwitcher";

export default function RentPage() {
  const { category, setCategory } = useRealEstateCategory();
  const ledgerState = useRentLedger(category);
  const summaryState = useRentSummary(category);
  const analyticsState = useOwnerAnalytics(category);

  const loading = ledgerState.loading || summaryState.loading || analyticsState.loading;
  const error = ledgerState.error ?? summaryState.error ?? analyticsState.error;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl text-white font-semibold">Rent Collection</h2>
        <p className="text-sm text-white/45">Ledger, overdue monitoring, receipts, and monthly performance summaries</p>
      </div>
      <RealEstateCategorySwitcher value={category} onChange={setCategory} />

      {error ? (
        <div className="glass-card border border-red-400/30 rounded-2xl p-4 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              void ledgerState.refresh();
              void summaryState.refresh();
              void analyticsState.refresh();
            }}
            className="text-red-200 font-semibold"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl border border-white/10 h-56 animate-pulse" />
      ) : (
        <>
          <RentWidgets summary={summaryState.data} />
          <MonthlySummaryChart analytics={analyticsState.data} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SimpleBarChart title="Occupancy Graph" points={analyticsState.data.occupancyGraph} />
            <SimpleBarChart title="NOI Growth" points={analyticsState.data.noiGrowth} />
          </div>

          <RentLedgerTable rows={ledgerState.data} />
        </>
      )}
    </div>
  );
}
