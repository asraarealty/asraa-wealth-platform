"use client";
import { useAssets, useInsights } from "@/lib/hooks/useAssets";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import type { Asset } from "@/lib/types/assets";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

const TYPE_COLORS: Record<string, string> = {
  stock: "#38bdf8",
  mf: "#34d399",
  property: "#a78bfa",
};

function SummaryCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-400/70">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className={`text-xs font-medium ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-gray-400"}`}>{sub}</p>}
    </motion.div>
  );
}

function AssetRow({ asset }: { asset: Asset }) {
  const positive = asset.return_percentage >= 0;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${TYPE_COLORS[asset.type] ?? "#38bdf8"}22`, color: TYPE_COLORS[asset.type] ?? "#38bdf8" }}
      >
        {asset.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{asset.name}</p>
        <p className="text-xs text-gray-500">{asset.symbol ?? asset.type.toUpperCase()}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-white">{fmt(asset.value)}</p>
        <p className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {fmtPct(asset.return_percentage)}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useAssets();
  const { data: insights } = useInsights();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center gap-4 pt-20">
        <p className="text-red-400 text-sm text-center">Failed to load portfolio data.</p>
        <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-sky-500/10 text-sky-400 text-sm font-semibold border border-sky-500/20">
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary ?? { total_value: 0, total_invested: 0, total_return: 0, return_percentage: 0 };
  const allocation = data?.allocation ?? { stock: 0, mf: 0, property: 0 };
  const assets = data?.assets ?? [];

  const pieData = [
    { name: "Stocks", value: allocation.stock, color: TYPE_COLORS.stock },
    { name: "Mutual Funds", value: allocation.mf, color: TYPE_COLORS.mf },
    { name: "Property", value: allocation.property, color: TYPE_COLORS.property },
  ].filter((d) => d.value > 0);

  const alerts = Array.isArray(insights?.alerts) ? insights.alerts : [];

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Asraa Wealth</p>
          <h1 className="text-2xl font-extrabold text-white">Portfolio</h1>
        </div>
        <Link href="/notifications"
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="text-lg">🔔</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Total Value" value={fmt(summary.total_value)} />
        <SummaryCard label="Total Invested" value={fmt(summary.total_invested)} />
        <SummaryCard
          label="Total Return"
          value={fmt(summary.total_return)}
          sub={fmtPct(summary.return_percentage)}
          positive={summary.total_return >= 0}
        />
        <SummaryCard
          label="Return %"
          value={fmtPct(summary.return_percentage)}
          positive={summary.return_percentage >= 0}
        />
      </div>

      {/* Allocation Chart */}
      {pieData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400/70 mb-3">Allocation</p>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={56} dataKey="value" strokeWidth={2} stroke="rgba(4,9,21,0.8)">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: "#0a1633", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-gray-300 flex-1">{d.name}</span>
                  <span className="text-xs font-semibold text-white">{d.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Insights / Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/70 mb-2">AI Insights</p>
          {alerts.slice(0, 3).map((alert: string, i: number) => (
            <div key={`${i}-${alert.slice(0, 20)}`} className="flex gap-2 text-xs text-gray-300">
              <span className="text-purple-400 shrink-0 mt-0.5">◉</span>
              <span>{typeof alert === "string" ? alert : String(alert)}</span>
            </div>
          ))}
          <Link href="/insights" className="text-xs text-purple-400 font-semibold block mt-2">View all insights →</Link>
        </motion.div>
      )}

      {/* Assets List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400/70">Holdings ({assets.length})</p>
          <Link href="/assets" className="text-xs text-sky-400 font-semibold">View all →</Link>
        </div>
        {assets.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No assets yet. Add your first investment.</p>
        ) : (
          <div>
            {assets.slice(0, 5).map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Spacer for FAB */}
      <div className="h-4" />

      {/* FAB */}
      <Link href="/assets/new"
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg z-40 transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg, #38bdf8, #3b82f6)", color: "#04102a" }}>
        +
      </Link>
    </div>
  );
}
