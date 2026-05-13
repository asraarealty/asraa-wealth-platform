import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { PropertyFinancials } from "@/lib/types/realEstate";

const fields: Array<{ label: string; key: keyof PropertyFinancials }> = [
  { label: "Rent Received", key: "rentReceived" },
  { label: "Pending Rent", key: "pendingRent" },
  { label: "Maintenance Expenses", key: "maintenanceExpenses" },
  { label: "Property Tax", key: "propertyTax" },
  { label: "Insurance", key: "insurance" },
  { label: "Monthly Cashflow", key: "monthlyCashflow" },
  { label: "NOI", key: "noi" },
];

export default function PropertyFinancialsCard({ financials }: { financials: PropertyFinancials }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10">
      <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold mb-4">Property Financials</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
        {fields.map((field) => (
          <div key={field.key} className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <p className="text-white/45">{field.label}</p>
            <p className="text-white font-medium mt-1">{fmtCurrency(financials[field.key] as number)}</p>
          </div>
        ))}
        <div className="rounded-xl border border-cyan-400/20 p-3 bg-cyan-500/5 sm:col-span-2 xl:col-span-1">
          <p className="text-cyan-200/70">Yearly Performance</p>
          <p className="text-cyan-300 font-semibold mt-1">{fmtPercent(financials.yearlyPerformance, true)}</p>
        </div>
      </div>
    </div>
  );
}
