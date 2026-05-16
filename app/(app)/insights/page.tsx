"use client";
import { useInsights, useAssets } from "@/lib/hooks/useAssets";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function InsightsPage() {
  const { data: insights, isLoading: insightsLoading } = useInsights();
  const { data: assetsData } = useAssets();

  const alerts = Array.isArray(insights?.alerts) ? insights.alerts : [];
  const assets = assetsData?.assets ?? [];
  const summary = assetsData?.summary;

  const topAssets = [...assets].sort((a, b) => b.value - a.value).slice(0, 5);

  const barData = topAssets.map((a) => ({
    name: a.name.length > 12 ? a.name.slice(0, 12) + "…" : a.name,
    value: a.value,
    return: a.return_percentage,
  }));

  const pieData = [
    { name: "Equity", value: insights?.equity_percentage ?? 0, color: "#38bdf8" },
    { name: "Real Estate", value: insights?.real_estate_percentage ?? 0, color: "#a78bfa" },
    { name: "Other", value: Math.max(0, 100 - (insights?.equity_percentage ?? 0) - (insights?.real_estate_percentage ?? 0)), color: "#34d399" },
  ].filter((d) => d.value > 0);

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-extrabold text-white">Insights</h1>

      {insightsLoading ? (
        <div className="flex justify-center pt-12">
          <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Portfolio allocation */}
          {pieData.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-400/70 mb-4">Portfolio Mix</p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={56} dataKey="value" strokeWidth={2} stroke="rgba(4,9,21,0.8)">
                        {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: "#0a1633", border: "none", borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {pieData.map((d) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{d.name}</span>
                        <span className="text-white font-semibold">{d.value.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full transition-all" style={{ width: `${d.value}%`, background: d.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Top holdings chart */}
          {barData.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-400/70 mb-4">Top Holdings</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip contentStyle={{ background: "#0a1633", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Summary stats */}
          {summary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: "Total Value", value: fmt(summary.total_value) },
                { label: "Total Invested", value: fmt(summary.total_invested) },
                { label: "Total Return", value: fmt(summary.total_return), positive: summary.total_return >= 0 },
                { label: "Return %", value: `${summary.return_percentage >= 0 ? "+" : ""}${summary.return_percentage.toFixed(2)}%`, positive: summary.return_percentage >= 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-lg font-bold mt-1 ${item.positive === true ? "text-emerald-400" : item.positive === false ? "text-red-400" : "text-white"}`}>{item.value}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* AI Alerts */}
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl p-4 space-y-3"
              style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/70">AI Recommendations</p>
              {alerts.map((alert, i) => (
                <div key={i} className="flex gap-2.5 p-3 rounded-xl" style={{ background: "rgba(167,139,250,0.08)" }}>
                  <span className="text-purple-400 text-base shrink-0 mt-0.5">◉</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{typeof alert === "string" ? alert : String(alert)}</p>
                </div>
              ))}
            </motion.div>
          )}

          {alerts.length === 0 && !insightsLoading && (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p className="text-3xl mb-2">◉</p>
              No AI insights available yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}
