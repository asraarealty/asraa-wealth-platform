"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtCurrency } from "@/lib/formatters";
import type { TenantSummary } from "@/lib/types/realEstate";
import StatusBadge from "@/components/properties/StatusBadge";

const ROW_HEIGHT = 66;
const TABLE_HEIGHT = 420;
const BUFFER_ROWS = 4;

export default function TenantsTable({ tenants }: { tenants: TenantSummary[] }) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalRows = tenants.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
  const visibleCount = Math.ceil(TABLE_HEIGHT / ROW_HEIGHT) + BUFFER_ROWS * 2;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);

  const visibleRows = tenants.slice(startIndex, endIndex);

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {[
                "Tenant",
                "Company",
                "Status",
                "Lease Window",
                "Rent",
                "Property",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-white/55 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      <div
        className="overflow-auto"
        style={{ maxHeight: TABLE_HEIGHT }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div style={{ height: totalRows * ROW_HEIGHT, position: "relative" }}>
          <table className="w-full min-w-[900px] text-sm" style={{ position: "absolute", top: startIndex * ROW_HEIGHT }}>
            <tbody>
              {visibleRows.map((tenant) => (
                <tr key={tenant.id} className="h-[66px] border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-white">
                    <Link href={`/tenants/${tenant.id}`} className="font-medium hover:text-cyan-300 transition-colors">
                      {tenant.contactName}
                    </Link>
                    <p className="text-xs text-white/45 mt-1 truncate max-w-[160px]">{tenant.email}</p>
                  </td>
                  <td className="px-4 py-3 text-white/80">{tenant.companyName}</td>
                  <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
                  <td className="px-4 py-3 text-white/70">{tenant.leaseStartDate} to {tenant.leaseEndDate}</td>
                  <td className="px-4 py-3 text-white/80">{fmtCurrency(tenant.rentAmount)}</td>
                  <td className="px-4 py-3 text-white/60">#{tenant.propertyId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
