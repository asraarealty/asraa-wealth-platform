import Link from "next/link";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { PropertySummary } from "@/lib/types/realEstate";
import { toTitleLabel } from "@/lib/utils/realEstate";
import StatusBadge from "./StatusBadge";

function safeText(value: unknown, fallback = "N/A"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export default function PropertiesTable({ properties }: { properties: PropertySummary[] }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto table-scroll-safe">
        <p className="text-[10px] text-white/30 px-4 pt-2 sm:hidden">← Scroll to see all columns</p>
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
                    {safeText(property.name, "Untitled Property")}
                  </Link>
                  <p className="text-xs text-white/45 mt-1 max-w-[220px] truncate">{safeText(property.address, "Address unavailable")}</p>
                </td>
                <td className="px-4 py-3 text-white/80">{toTitleLabel(property.type)}</td>
                <td className="px-4 py-3"><StatusBadge status={property.occupancyStatus} /></td>
                <td className="px-4 py-3 text-white/75">{toTitleLabel(property.lifecycleStage)}</td>
                <td className="px-4 py-3 text-white/80">{fmtCurrency(property.purchaseValue)}</td>
                <td className="px-4 py-3 text-white/80">{fmtCurrency(property.currentValue)}</td>
                <td className="px-4 py-3 text-white/80">{fmtPercent(property.roiPercent, true)}</td>
                <td className="px-4 py-3 text-white/80">{fmtPercent(property.rentalYieldPercent)}</td>
                <td className="px-4 py-3 text-white/80">{fmtCurrency(property.noi)}</td>
                <td className="px-4 py-3 text-white/65">{safeText(property.tenantStatus, "No tenant data")}</td>
              </tr>
            ))}
            {properties.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-white/55">
                  No properties found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
