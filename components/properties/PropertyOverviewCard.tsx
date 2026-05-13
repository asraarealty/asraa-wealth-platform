import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { PropertyDetail } from "@/lib/types/realEstate";
import StatusBadge from "./StatusBadge";

export default function PropertyOverviewCard({ property }: { property: PropertyDetail }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10">
      <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold mb-4">Property Overview</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
        <div><p className="text-white/45">Property Name</p><p className="text-white font-medium mt-1">{property.name}</p></div>
        <div><p className="text-white/45">Property Type</p><p className="text-white font-medium mt-1 capitalize">{property.type.replace(/_/g, " ")}</p></div>
        <div><p className="text-white/45">Address</p><p className="text-white font-medium mt-1">{property.address}</p></div>
        <div><p className="text-white/45">Occupancy Status</p><div className="mt-1"><StatusBadge status={property.occupancyStatus} /></div></div>
        <div><p className="text-white/45">Lifecycle Stage</p><p className="text-white font-medium mt-1 capitalize">{property.lifecycleStage.replace(/_/g, " ")}</p></div>
        <div><p className="text-white/45">Tenant Status</p><p className="text-white font-medium mt-1">{property.tenantStatus}</p></div>
        <div><p className="text-white/45">Purchase Value</p><p className="text-white font-medium mt-1">{fmtCurrency(property.purchaseValue)}</p></div>
        <div><p className="text-white/45">Current Value</p><p className="text-white font-medium mt-1">{fmtCurrency(property.currentValue)}</p></div>
        <div><p className="text-white/45">ROI</p><p className="text-white font-medium mt-1">{fmtPercent(property.roiPercent, true)}</p></div>
        <div><p className="text-white/45">Rental Yield</p><p className="text-white font-medium mt-1">{fmtPercent(property.rentalYieldPercent)}</p></div>
        <div><p className="text-white/45">NOI</p><p className="text-white font-medium mt-1">{fmtCurrency(property.noi)}</p></div>
        <div><p className="text-white/45">Units Occupied</p><p className="text-white font-medium mt-1">{property.leasedUnits} / {property.totalUnits}</p></div>
      </div>
    </div>
  );
}
