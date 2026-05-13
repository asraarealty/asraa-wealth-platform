import { fmtCurrency } from "@/lib/formatters";
import type { TenantDetail } from "@/lib/types/realEstate";
import StatusBadge from "@/components/properties/StatusBadge";

export default function TenantProfileCard({ tenant }: { tenant: TenantDetail }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold">Tenant Profile</p>
          <h1 className="text-2xl font-semibold text-white mt-2">{tenant.companyName}</h1>
          <p className="text-sm text-white/55 mt-1">{tenant.contactName} · {tenant.email} · {tenant.phone}</p>
        </div>
        <StatusBadge status={tenant.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-5 text-sm">
        <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
          <p className="text-white/45">Lease Dates</p>
          <p className="text-white mt-1">{tenant.leaseStartDate} → {tenant.leaseEndDate}</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
          <p className="text-white/45">Rent Amount</p>
          <p className="text-white mt-1">{fmtCurrency(tenant.rentAmount)}</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
          <p className="text-white/45">Deposit Amount</p>
          <p className="text-white mt-1">{fmtCurrency(tenant.depositAmount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
          <p className="text-sm font-semibold text-white">Escalation Schedule</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {tenant.escalationSchedule.map((item) => (
              <li key={item.effectiveDate}>• {item.effectiveDate} — {item.increasePercent}%</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
          <p className="text-sm font-semibold text-white">Complaints</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {tenant.complaints.length > 0 ? (
              tenant.complaints.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{item.title}</span>
                  <StatusBadge status={item.status} />
                </li>
              ))
            ) : (
              <li className="text-white/40">No complaints logged</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
