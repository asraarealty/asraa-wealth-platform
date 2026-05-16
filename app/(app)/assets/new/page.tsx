"use client";
import { useState } from "react";
import { useCreateAsset } from "@/lib/hooks/useAssets";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type AssetType = "stock" | "mf" | "property";

export default function AddAssetPage() {
  const router = useRouter();
  const createAsset = useCreateAsset();
  const [type, setType] = useState<AssetType>("stock");
  const [form, setForm] = useState<Record<string, string | boolean>>({
    name: "", symbol: "", quantity: "", avg_price: "", current_price: "",
    units: "", nav: "",
    location: "", purchase_price: "", current_value: "",
    rent_amount: "", rent_due_date: "", tenant_name: "", tenant_phone: "", tenant_email: "",
    rent_received: false, last_paid_date: "",
  });
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: Record<string, unknown> = { type, name: form.name, tags: [] };
      if (type === "stock") {
        payload.symbol = form.symbol;
        payload.quantity = Number(form.quantity);
        payload.avg_price = Number(form.avg_price);
        payload.current_price = Number(form.current_price);
      } else if (type === "mf") {
        payload.symbol = form.symbol;
        payload.units = Number(form.units);
        payload.nav = Number(form.nav);
      } else {
        payload.location = form.location;
        payload.purchase_price = Number(form.purchase_price);
        payload.current_value = Number(form.current_value);
        payload.rent_amount = form.rent_amount ? Number(form.rent_amount) : undefined;
        payload.rent_due_date = form.rent_due_date || undefined;
        payload.tenant_name = form.tenant_name || undefined;
        payload.tenant_phone = form.tenant_phone || undefined;
        payload.tenant_email = form.tenant_email || undefined;
        payload.rent_received = Boolean(form.rent_received);
        payload.last_paid_date = form.last_paid_date || undefined;
      }
      await createAsset.mutateAsync(payload);
      router.push("/assets");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-sky-500/50 transition-all";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };
  const labelClass = "text-xs font-semibold text-gray-400 uppercase tracking-wider";

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white" style={{ background: "rgba(255,255,255,0.05)" }}>
          ←
        </button>
        <h1 className="text-xl font-extrabold text-white">Add Asset</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type selector */}
        <div>
          <p className={labelClass + " mb-2"}>Asset Type</p>
          <div className="flex gap-2">
            {(["stock", "mf", "property"] as AssetType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === t ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "text-gray-500 border border-white/5"
                }`}
              >
                {t === "mf" ? "MF" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className={labelClass + " block mb-1.5"}>Name *</label>
          <input required style={inputStyle} className={inputClass} placeholder="e.g. Reliance Industries" value={form.name as string} onChange={(e) => set("name", e.target.value)} />
        </div>

        {/* Stock fields */}
        {type === "stock" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div><label className={labelClass + " block mb-1.5"}>Symbol</label><input style={inputStyle} className={inputClass} placeholder="RELIANCE" value={form.symbol as string} onChange={(e) => set("symbol", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass + " block mb-1.5"}>Quantity</label><input type="number" style={inputStyle} className={inputClass} placeholder="10" value={form.quantity as string} onChange={(e) => set("quantity", e.target.value)} /></div>
              <div><label className={labelClass + " block mb-1.5"}>Avg Price (₹)</label><input type="number" style={inputStyle} className={inputClass} placeholder="2500" value={form.avg_price as string} onChange={(e) => set("avg_price", e.target.value)} /></div>
            </div>
            <div><label className={labelClass + " block mb-1.5"}>Current Price (₹)</label><input type="number" style={inputStyle} className={inputClass} placeholder="2800" value={form.current_price as string} onChange={(e) => set("current_price", e.target.value)} /></div>
          </motion.div>
        )}

        {/* MF fields */}
        {type === "mf" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div><label className={labelClass + " block mb-1.5"}>Fund Symbol / Code</label><input style={inputStyle} className={inputClass} placeholder="ABCMF" value={form.symbol as string} onChange={(e) => set("symbol", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass + " block mb-1.5"}>Units</label><input type="number" style={inputStyle} className={inputClass} placeholder="100.5" value={form.units as string} onChange={(e) => set("units", e.target.value)} /></div>
              <div><label className={labelClass + " block mb-1.5"}>NAV (₹)</label><input type="number" style={inputStyle} className={inputClass} placeholder="45.60" value={form.nav as string} onChange={(e) => set("nav", e.target.value)} /></div>
            </div>
          </motion.div>
        )}

        {/* Property fields */}
        {type === "property" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div><label className={labelClass + " block mb-1.5"}>Location</label><input style={inputStyle} className={inputClass} placeholder="Mumbai, Maharashtra" value={form.location as string} onChange={(e) => set("location", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass + " block mb-1.5"}>Purchase Price (₹)</label><input type="number" style={inputStyle} className={inputClass} placeholder="5000000" value={form.purchase_price as string} onChange={(e) => set("purchase_price", e.target.value)} /></div>
              <div><label className={labelClass + " block mb-1.5"}>Current Value (₹)</label><input type="number" style={inputStyle} className={inputClass} placeholder="6500000" value={form.current_value as string} onChange={(e) => set("current_value", e.target.value)} /></div>
            </div>
            <div><label className={labelClass + " block mb-1.5"}>Monthly Rent (₹)</label><input type="number" style={inputStyle} className={inputClass} placeholder="25000" value={form.rent_amount as string} onChange={(e) => set("rent_amount", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Rent Due Date</label><input type="date" style={inputStyle} className={inputClass} value={form.rent_due_date as string} onChange={(e) => set("rent_due_date", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Tenant Name</label><input style={inputStyle} className={inputClass} placeholder="John Doe" value={form.tenant_name as string} onChange={(e) => set("tenant_name", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Tenant Phone</label><input style={inputStyle} className={inputClass} placeholder="+91 9999999999" value={form.tenant_phone as string} onChange={(e) => set("tenant_phone", e.target.value)} /></div>
            <div><label className={labelClass + " block mb-1.5"}>Tenant Email</label><input type="email" style={inputStyle} className={inputClass} placeholder="tenant@example.com" value={form.tenant_email as string} onChange={(e) => set("tenant_email", e.target.value)} /></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="rent_received" checked={Boolean(form.rent_received)} onChange={(e) => set("rent_received", e.target.checked)} className="w-4 h-4 rounded accent-sky-400" />
              <label htmlFor="rent_received" className="text-sm text-gray-300">Rent Received</label>
            </div>
            <div><label className={labelClass + " block mb-1.5"}>Last Paid Date</label><input type="date" style={inputStyle} className={inputClass} value={form.last_paid_date as string} onChange={(e) => set("last_paid_date", e.target.value)} /></div>
          </motion.div>
        )}

        {error && (
          <div className="rounded-xl p-3 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={createAsset.isPending}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #38bdf8, #3b82f6)", color: "#04102a" }}
        >
          {createAsset.isPending ? "Saving…" : "Add Asset"}
        </button>
      </form>
    </div>
  );
}
