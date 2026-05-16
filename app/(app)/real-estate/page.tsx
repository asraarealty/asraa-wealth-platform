"use client";
import { useAssets } from "@/lib/hooks/useAssets";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Asset } from "@/lib/types/assets";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function PropertyCard({ asset }: { asset: Asset }) {
  const rentDue = asset.rent_due_date ? new Date(asset.rent_due_date) : null;
  const today = new Date();
  const daysUntilRent = rentDue ? Math.ceil((rentDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const rentOverdue = daysUntilRent !== null && daysUntilRent < 0 && !asset.rent_received;
  const rentDueSoon = daysUntilRent !== null && daysUntilRent >= 0 && daysUntilRent <= 5 && !asset.rent_received;

  const appreciation = asset.current_value && asset.purchase_price
    ? ((asset.current_value - asset.purchase_price) / asset.purchase_price) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.2)" }}>
          🏠
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{asset.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">📍 {asset.location ?? "Location not set"}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-white text-sm">{fmt(asset.current_value ?? asset.value)}</p>
          <p className={`text-xs font-medium ${appreciation >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Value breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-gray-500">Purchase</p>
          <p className="text-white font-semibold mt-0.5">{asset.purchase_price ? fmt(asset.purchase_price) : "—"}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-gray-500">Current</p>
          <p className="text-white font-semibold mt-0.5">{asset.current_value ? fmt(asset.current_value) : "—"}</p>
        </div>
      </div>

      {/* Rent status */}
      {asset.rent_amount && (
        <div className={`rounded-xl p-3 flex items-center justify-between ${
          rentOverdue ? "bg-red-500/10 border border-red-500/20" :
          rentDueSoon ? "bg-amber-500/10 border border-amber-500/20" :
          "bg-emerald-500/10 border border-emerald-500/20"
        }`}>
          <div>
            <p className={`text-xs font-semibold ${rentOverdue ? "text-red-400" : rentDueSoon ? "text-amber-400" : "text-emerald-400"}`}>
              {rentOverdue ? "⚠ Rent Overdue" : rentDueSoon ? "⚡ Due Soon" : "✓ Rent On Track"}
            </p>
            <p className="text-white font-bold mt-0.5">{fmt(asset.rent_amount)}/mo</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            {asset.rent_due_date && <p>Due: {asset.rent_due_date}</p>}
            {asset.last_paid_date && <p>Last: {asset.last_paid_date}</p>}
          </div>
        </div>
      )}

      {/* Tenant info */}
      {asset.tenant_name && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tenant</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
              {asset.tenant_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{asset.tenant_name}</p>
              {asset.tenant_phone && <p className="text-xs text-gray-500">{asset.tenant_phone}</p>}
            </div>
          </div>
          {asset.tenant_email && <p className="text-xs text-gray-500">{asset.tenant_email}</p>}
        </div>
      )}

      <Link href={`/assets/${asset.id}/edit`} className="block w-full py-2.5 rounded-xl text-xs font-semibold text-center text-sky-400 border border-sky-500/20 hover:bg-sky-500/10 transition-colors">
        Manage Property →
      </Link>
    </motion.div>
  );
}

export default function RealEstatePage() {
  const { data, isLoading } = useAssets();
  const properties = (data?.assets ?? []).filter((a) => a.type === "property");
  const totalValue = properties.reduce((s, a) => s + (a.current_value ?? a.value), 0);
  const totalRent = properties.reduce((s, a) => s + (a.rent_amount ?? 0), 0);

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Real Estate</p>
          <h1 className="text-2xl font-extrabold text-white">Portfolio</h1>
        </div>
        <Link href="/assets/new"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-purple-400 border border-purple-500/20 hover:bg-purple-500/10 transition-colors">
          + Property
        </Link>
      </div>

      {/* Summary */}
      {properties.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}>
            <p className="text-xs text-purple-400/70 uppercase tracking-wider">Portfolio Value</p>
            <p className="text-xl font-extrabold text-white mt-1">{fmt(totalValue)}</p>
            <p className="text-xs text-gray-500 mt-1">{properties.length} properties</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider">Monthly Rent</p>
            <p className="text-xl font-extrabold text-white mt-1">{fmt(totalRent)}</p>
            <p className="text-xs text-gray-500 mt-1">per month</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && properties.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-gray-400 text-sm">No properties yet</p>
          <Link href="/assets/new" className="text-purple-400 font-semibold text-sm mt-2 inline-block">Add a property →</Link>
        </div>
      )}

      <div className="space-y-4">
        {properties.map((p) => <PropertyCard key={p.id} asset={p} />)}
      </div>
    </div>
  );
}
