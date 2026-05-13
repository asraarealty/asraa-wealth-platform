import Link from "next/link";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { PropertySummary } from "@/lib/types/realEstate";
import StatusBadge from "./StatusBadge";

export default function PropertiesTable({ properties }: { properties: PropertySummary[] }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {[
                "Property",
                "Type",
                "Occupancy",
                "Lifecycle",
                "Purchase Value",
                "Current Value",
                "ROI",
                "Yield",
                "NOI",
                "Tenant Status",
              ].map((head) => (
                <th key={head} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-white/55 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3 text-white font-medium">
                  <Link href={`/properties/${property.id}`} className="hover:text-cyan-300 transition-colors">
                    {property.name}
                  </Link>
                  <p className="text-xs text-white/45 mt-1 max-w-[220px] truncate">{property.address}</p>
                </td>
                <td className="px-4 py-3 text-white/80">{property.type.replace(/_/g, " ")}</td>
                <td className="px-4 py-3"><StatusBadge status={property.occupancyStatus} /></td>
                <td className="px-4 py-3 text-white/75">{property.lifecycleStage.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-white/80">{fmtCurrency(property.purchaseValue)}</td>
                <td className="px-4 py-3 text-white/80">{fmtCurrency(property.currentValue)}</td>
                <td className="px-4 py-3 text-white/80">{fmtPercent(property.roiPercent, true)}</td>
                <td className="px-4 py-3 text-white/80">{fmtPercent(property.rentalYieldPercent)}</td>
                <td className="px-4 py-3 text-white/80">{fmtCurrency(property.noi)}</td>
                <td className="px-4 py-3 text-white/65">{property.tenantStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
