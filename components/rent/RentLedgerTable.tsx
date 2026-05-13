import { fmtCurrency } from "@/lib/formatters";
import type { RentLedgerItem } from "@/lib/types/realEstate";
import StatusBadge from "@/components/properties/StatusBadge";

export default function RentLedgerTable({ rows }: { rows: RentLedgerItem[] }) {
  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {["Month", "Due Date", "Amount", "Status", "Paid At", "Receipt", "Tenant", "Property"].map((head) => (
                <th key={head} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-white/55 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3 text-white/80">{item.month}</td>
                <td className="px-4 py-3 text-white/70">{item.dueDate}</td>
                <td className="px-4 py-3 text-white">{fmtCurrency(item.amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-white/70">{item.paidAt ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{item.receiptNumber ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">#{item.tenantId}</td>
                <td className="px-4 py-3 text-white/60">#{item.propertyId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
