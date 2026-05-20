"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { formatCurrency, formatPercent } from "@/lib/formatters/finance";
import type { FormBaseProps } from "./types";

const schema = z.object({
  propertyName: z.string().trim().min(1, "Property Name is required"),
  location: z.string().trim().min(1, "Location is required"),
  purchasePrice: z.number().nonnegative("Purchase Price must be 0 or greater"),
  currentValuation: z.number().nonnegative("Current Valuation must be 0 or greater"),
  monthlyRent: z.number().nonnegative("Monthly Rent must be 0 or greater").optional(),
  tenantDetails: z.string().trim().optional(),
});

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PropertyHoldingForm({
  mode,
  holding,
  isSubmitting = false,
  error = null,
  onDirtyChange,
  onSubmit,
}: FormBaseProps) {
  const [propertyName, setPropertyName] = useState(holding?.name ?? "");
  const [location, setLocation] = useState(holding?.location ?? "");
  const [purchasePrice, setPurchasePrice] = useState(String(holding?.purchasePrice ?? ""));
  const [currentValuation, setCurrentValuation] = useState(String(holding?.currentValuation ?? holding?.valuation.currentValue ?? ""));
  const [monthlyRent, setMonthlyRent] = useState(String(holding?.monthlyRent ?? ""));
  const [tenantDetails, setTenantDetails] = useState(holding?.tenantDetails ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const initialSnapshot = useRef(
    JSON.stringify({
      propertyName: holding?.name ?? "",
      location: holding?.location ?? "",
      purchasePrice: String(holding?.purchasePrice ?? ""),
      currentValuation: String(holding?.currentValuation ?? holding?.valuation.currentValue ?? ""),
      monthlyRent: String(holding?.monthlyRent ?? ""),
      tenantDetails: holding?.tenantDetails ?? "",
    })
  );

  useEffect(() => {
    const snapshot = JSON.stringify({
      propertyName,
      location,
      purchasePrice,
      currentValuation,
      monthlyRent,
      tenantDetails,
    });
    onDirtyChange(snapshot !== initialSnapshot.current);
  }, [propertyName, location, purchasePrice, currentValuation, monthlyRent, tenantDetails, onDirtyChange]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({
      propertyName,
      location,
      purchasePrice: toNumber(purchasePrice),
      currentValuation: toNumber(currentValuation),
      monthlyRent: monthlyRent.trim() ? toNumber(monthlyRent) : undefined,
      tenantDetails,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Please check the form values");
      return;
    }

    setValidationError(null);
    await onSubmit({
      type: "property",
      name: parsed.data.propertyName,
      location: parsed.data.location,
      purchase_price: parsed.data.purchasePrice,
      current_value: parsed.data.currentValuation,
      ...(parsed.data.monthlyRent !== undefined ? { rent_amount: parsed.data.monthlyRent } : {}),
      ...(parsed.data.tenantDetails ? { tenant_name: parsed.data.tenantDetails, tenant_details: parsed.data.tenantDetails } : {}),
      tags: [],
    });
  }

  const readOnly = useMemo(
    () => [
      { label: "Rental Yield", value: formatPercent(holding?.valuation.rentalYield) },
      { label: "Appreciation", value: formatCurrency(holding?.valuation.appreciation) },
      { label: "Net Return", value: formatCurrency(holding?.valuation.netReturn) },
    ],
    [holding?.valuation.appreciation, holding?.valuation.netReturn, holding?.valuation.rentalYield]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Property Name</label>
        <input value={propertyName} onChange={(event) => setPropertyName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Location</label>
        <input value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Purchase Price</label>
          <input type="number" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Current Valuation</label>
          <input type="number" value={currentValuation} onChange={(event) => setCurrentValuation(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Monthly Rent</label>
          <input type="number" value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Tenant Details</label>
          <input value={tenantDetails} onChange={(event) => setTenantDetails(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {readOnly.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">{metric.value}</p>
          </div>
        ))}
      </div>

      {(validationError || error) ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{validationError ?? error}</div>
      ) : null}

      <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#3b82f6)] py-4 text-sm font-bold text-[#04102a] transition disabled:opacity-60">
        {isSubmitting ? "Saving…" : mode === "create" ? "Add Holding" : "Save Changes"}
      </button>
    </form>
  );
}
