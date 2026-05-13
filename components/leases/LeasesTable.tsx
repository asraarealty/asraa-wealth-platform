import { fmtCurrency } from "@/lib/formatters";
import type { LeaseSummary } from "@/lib/types/realEstate";
import StatusBadge from "@/components/properties/StatusBadge";
import LeaseCountdownBadge from "./LeaseCountdownBadge";

function countdown(endDate: string): number {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export default function LeasesTable({ leases }: { leases: LeaseSummary[] }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {["Lease", "Status", "Timeline", "Lock-in", "Escalation", "Renewal Reminder", "Countdown"].map((head) => (
                <th key={head} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-white/55 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leases.map((lease) => {
              const days = countdown(lease.endDate);
              return (
                <tr key={lease.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">#{lease.id}<p className="text-xs text-white/45">Property #{lease.propertyId} · Tenant #{lease.tenantId}</p></td>
                  <td className="px-4 py-3"><StatusBadge status={lease.status} /></td>
                  <td className="px-4 py-3 text-white/70">{lease.startDate} → {lease.endDate}</td>
                  <td className="px-4 py-3 text-white/75">{lease.lockInMonths} months</td>
                  <td className="px-4 py-3 text-white/75">{lease.escalationPercent}%</td>
                  <td className="px-4 py-3 text-white/75">{lease.renewalReminderDays} days</td>
                  <td className="px-4 py-3"><div className="flex items-center justify-between gap-2"><LeaseCountdownBadge days={days} status={lease.status} /><span className="text-white/70">{fmtCurrency(lease.rentAmount)}</span></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
