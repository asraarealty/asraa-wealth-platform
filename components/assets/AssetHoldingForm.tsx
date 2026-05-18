"use client";

import { useMemo, useState } from "react";
import type { Asset, AssetType } from "@/lib/types/assets";
import { LiveAssetPicker, type LiveAssetSelection } from "@/components/assets/LiveAssetPicker";

interface AssetHoldingFormProps {
  mode: "create" | "edit";
  initialAsset?: Asset | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

type FormType = AssetType;

function toNum(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function AssetHoldingForm({
  mode,
  initialAsset,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
}: AssetHoldingFormProps) {
  const [type, setType] = useState<FormType>(initialAsset?.type ?? "stock");
  const [form, setForm] = useState<Record<string, string | boolean>>({
    name: initialAsset?.name ?? "",
    symbol: initialAsset?.symbol ?? "",
    quantity: String(initialAsset?.quantity ?? ""),
    avg_price: String(initialAsset?.avg_price ?? ""),
    current_price: String(initialAsset?.current_price ?? ""),
    units: String(initialAsset?.units ?? ""),
    nav: String(initialAsset?.nav ?? ""),
    location: initialAsset?.location ?? "",
    purchase_price: String(initialAsset?.purchase_price ?? ""),
    current_value: String(initialAsset?.current_value ?? ""),
    rent_amount: String(initialAsset?.rent_amount ?? ""),
    rent_due_date: initialAsset?.rent_due_date ?? "",
    tenant_name: initialAsset?.tenant_name ?? "",
    tenant_phone: initialAsset?.tenant_phone ?? "",
    tenant_email: initialAsset?.tenant_email ?? "",
    rent_received: Boolean(initialAsset?.rent_received),
    last_paid_date: initialAsset?.last_paid_date ?? "",
  });

  const title = useMemo(
    () => (mode === "create" ? "Add Holding" : "Edit Holding"),
    [mode]
  );

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyLiveSelection(selection: LiveAssetSelection) {
    setForm((prev) => {
      const next: Record<string, string | boolean> = {
        ...prev,
        symbol: selection.symbol,
        name: selection.name,
      };
      if (selection.kind === "mutual-fund") {
        next.nav = selection.price ? String(selection.price) : String(prev.nav ?? "");
        next.avg_price = next.nav;
        next.current_price = next.nav;
      } else if (selection.kind === "commodity" || selection.kind === "metal") {
        next.avg_price = selection.price ? String(selection.price) : String(prev.avg_price ?? "");
        next.current_price = next.avg_price;
      } else {
        next.avg_price = selection.price ? String(selection.price) : String(prev.avg_price ?? "");
        next.current_price = next.avg_price;
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = { type, name: form.name, tags: [] };

    if (type === "stock") {
      payload.symbol = form.symbol;
      payload.quantity = toNum(String(form.quantity));
      payload.avg_price = toNum(String(form.avg_price));
      payload.current_price = toNum(String(form.current_price));
    } else if (type === "mf") {
      const units = toNum(String(form.units));
      const nav = toNum(String(form.nav));
      payload.symbol = form.symbol;
      payload.units = units;
      payload.nav = nav;
      payload.quantity = units;
      payload.avg_price = nav;
      payload.current_price = nav;
    } else if (type === "commodity") {
      payload.symbol = form.symbol;
      payload.quantity = toNum(String(form.quantity));
      payload.avg_price = toNum(String(form.avg_price));
      payload.current_price = toNum(String(form.current_price));
    } else {
      payload.location = form.location;
      payload.purchase_price = toNum(String(form.purchase_price));
      payload.current_value = toNum(String(form.current_value));
      payload.rent_amount = form.rent_amount ? toNum(String(form.rent_amount)) : undefined;
      payload.rent_due_date = form.rent_due_date || undefined;
      payload.tenant_name = form.tenant_name || undefined;
      payload.tenant_phone = form.tenant_phone || undefined;
      payload.tenant_email = form.tenant_email || undefined;
      payload.rent_received = Boolean(form.rent_received);
      payload.last_paid_date = form.last_paid_date || undefined;
    }

    await onSubmit(payload);
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-sky-500/50 transition-all";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };
  const labelClass = "text-xs font-semibold text-gray-400 uppercase tracking-wider";

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white" style={{ background: "rgba(255,255,255,0.05)" }}>
          ←
        </button>
        <h1 className="text-xl font-extrabold text-white">{title}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className={labelClass + " mb-2"}>Asset Type</p>
          <div className="grid grid-cols-2 gap-2">
            {(["stock", "mf", "commodity", "property"] as FormType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === t ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "text-gray-500 border border-white/5"
                }`}
              >
                {t === "mf" ? "MF" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass + " block mb-1.5"}>Name *</label>
          <input required style={inputStyle} className={inputClass} value={String(form.name)} onChange={(e) => set("name", e.target.value)} />
        </div>

        {(type === "stock" || type === "mf" || type === "commodity") && (
          <div>
            <label className={labelClass + " block mb-1.5"}>Live Asset Picker</label>
            <LiveAssetPicker
              value={String(form.symbol || form.name)}
              allowedKinds={
                type === "stock"
                  ? ["stock", "global-stock", "etf"]
                  : type === "mf"
                  ? ["mutual-fund"]
                  : ["commodity", "metal"]
              }
              placeholder="Search live stocks, funds, and commodities"
              onSelect={applyLiveSelection}
            />
          </div>
        )}

        {(type === "stock" || type === "commodity") && (
          <div className="space-y-4">
            <div><label className={labelClass + " block mb-1.5"}>Symbol</label><input style={inputStyle} className={inputClass} value={String(form.symbol)} onChange={(e) => set("symbol", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass + " block mb-1.5"}>Quantity</label><input type="number" style={inputStyle} className={inputClass} value={String(form.quantity)} onChange={(e) => set("quantity", e.target.value)} /></div>
              <div><label className={labelClass + " block mb-1.5"}>Avg Price (₹)</label><input type="number" style={inputStyle} className={inputClass} value={String(form.avg_price)} onChange={(e) => set("avg_price", e.target.value)} /></div>
            </div>
            <div><label className={labelClass + " block mb-1.5"}>Current Price (₹)</label><input type="number" style={inputStyle} className={inputClass} value={String(form.current_price)} onChange={(e) => set("current_price", e.target.value)} /></div>
          </div>
        )}

        {type === "mf" && (
          <div className="space-y-4">
            <div><label className={labelClass + " block mb-1.5"}>Fund Symbol / Code</label><input style={inputStyle} className={inputClass} value={String(form.symbol)} onChange={(e) => set("symbol", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass + " block mb-1.5"}>Units</label><input type="number" style={inputStyle} className={inputClass} value={String(form.units)} onChange={(e) => set("units", e.target.value)} /></div>
              <div><label className={labelClass + " block mb-1.5"}>NAV (₹)</label><input type="number" style={inputStyle} className={inputClass} value={String(form.nav)} onChange={(e) => set("nav", e.target.value)} /></div>
            </div>
          </div>
        )}

        {type === "property" && (
          <div className="space-y-4">
            <div><label className={labelClass + " block mb-1.5"}>Location</label><input style={inputStyle} className={inputClass} value={String(form.location)} onChange={(e) => set("location", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass + " block mb-1.5"}>Purchase Price (₹)</label><input type="number" style={inputStyle} className={inputClass} value={String(form.purchase_price)} onChange={(e) => set("purchase_price", e.target.value)} /></div>
              <div><label className={labelClass + " block mb-1.5"}>Current Value (₹)</label><input type="number" style={inputStyle} className={inputClass} value={String(form.current_value)} onChange={(e) => set("current_value", e.target.value)} /></div>
            </div>
            <div><label className={labelClass + " block mb-1.5"}>Monthly Rent (₹)</label><input type="number" style={inputStyle} className={inputClass} value={String(form.rent_amount)} onChange={(e) => set("rent_amount", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Rent Due Date</label><input type="date" style={inputStyle} className={inputClass} value={String(form.rent_due_date)} onChange={(e) => set("rent_due_date", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Tenant Name</label><input style={inputStyle} className={inputClass} value={String(form.tenant_name)} onChange={(e) => set("tenant_name", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Tenant Phone</label><input style={inputStyle} className={inputClass} value={String(form.tenant_phone)} onChange={(e) => set("tenant_phone", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Tenant Email</label><input type="email" style={inputStyle} className={inputClass} value={String(form.tenant_email)} onChange={(e) => set("tenant_email", e.target.value)} /></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="rent_received" checked={Boolean(form.rent_received)} onChange={(e) => set("rent_received", e.target.checked)} className="w-4 h-4 rounded accent-sky-400" />
              <label htmlFor="rent_received" className="text-sm text-gray-300">Rent Received</label>
            </div>
            <div><label className={labelClass + " block mb-1.5"}>Last Paid Date</label><input type="date" style={inputStyle} className={inputClass} value={String(form.last_paid_date)} onChange={(e) => set("last_paid_date", e.target.value)} /></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-3 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #38bdf8, #3b82f6)", color: "#04102a" }}
        >
          {isSubmitting ? "Saving…" : mode === "create" ? "Add Holding" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
