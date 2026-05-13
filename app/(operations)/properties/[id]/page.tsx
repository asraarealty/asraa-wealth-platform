"use client";

import { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useOwnerAnalytics, useProperty } from "@/hooks/useRealEstate";
import PropertyOverviewCard from "@/components/properties/PropertyOverviewCard";
import PropertyFinancialsCard from "@/components/properties/PropertyFinancialsCard";
import PropertyDocumentsPanel from "@/components/properties/PropertyDocumentsPanel";

const SimpleBarChart = dynamic(() => import("@/components/properties/SimpleBarChart"));

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);

  const propertyState = useProperty(propertyId);
  const analyticsState = useOwnerAnalytics();

  const charts = useMemo(() => {
    return {
      occupancy: analyticsState.data.occupancyTrend,
      expenses: analyticsState.data.expenseBreakdown,
      noiGrowth: analyticsState.data.noiGrowth,
      rentTrend: analyticsState.data.rentTrend,
    };
  }, [analyticsState.data]);

  if (propertyState.loading) {
    return <div className="glass-card rounded-2xl border border-white/10 h-52 animate-pulse" />;
  }

  if (propertyState.error) {
    return (
      <div className="glass-card rounded-2xl border border-red-400/30 p-5 text-red-200">
        <p>{propertyState.error}</p>
        <button className="mt-3 text-sm font-semibold" onClick={() => void propertyState.refresh()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white">{propertyState.data.name}</h2>
          <p className="text-sm text-white/45 mt-1">Property detail, financials, operational documentation, and owner analytics</p>
        </div>
        <Link href="/properties" className="px-3.5 py-2 rounded-xl border border-white/10 text-sm text-white/70 hover:text-white transition-colors">
          Back to Properties
        </Link>
      </div>

      <PropertyOverviewCard property={propertyState.data} />
      <PropertyFinancialsCard financials={propertyState.data.financials} />
      <PropertyDocumentsPanel property={propertyState.data} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SimpleBarChart title="Occupancy Trend" points={charts.occupancy} />
        <SimpleBarChart title="Rent Trend" points={charts.rentTrend} />
        <SimpleBarChart title="Expense Breakdown" points={charts.expenses} />
        <SimpleBarChart title="NOI Growth" points={charts.noiGrowth} />
      </div>
    </div>
  );
}
