"use client";

import { useParams } from "next/navigation";
import TenantProfileCard from "@/components/tenants/TenantProfileCard";
import TenantHistoryTimeline from "@/components/tenants/TenantHistoryTimeline";
import { useTenant } from "@/hooks/useRealEstate";
import { fmtCurrency } from "@/lib/formatters";

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = Number(params.id);
  const { data, loading, error, refresh } = useTenant(tenantId);

  return (
    <div className="space-y-4 sm:space-y-5">
      {loading ? <div className="glass-card rounded-2xl border border-white/10 h-52 animate-pulse" /> : null}

      {error ? (
        <div className="glass-card rounded-2xl border border-red-400/30 p-5 text-red-200">
          <p>{error}</p>
          <button className="mt-3 text-sm font-semibold" onClick={() => void refresh()}>Retry</button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <TenantProfileCard tenant={data} />

          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold mb-4">Payment History</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Month", "Amount", "Status", "Paid On"].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-white/55 font-semibold">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.paymentHistory.map((item) => (
                    <tr key={item.id} className="border-b border-white/5 last:border-b-0">
                      <td className="px-4 py-3 text-white/75">{item.month}</td>
                      <td className="px-4 py-3 text-white">{fmtCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-white/75">{item.status}</td>
                      <td className="px-4 py-3 text-white/60">{item.paidOn ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <TenantHistoryTimeline tenant={data} />
        </>
      ) : null}
    </div>
  );
}
