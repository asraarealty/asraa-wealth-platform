"use client";
import { useInsights } from "@/lib/hooks/useAssets";
import { motion } from "framer-motion";

export default function NotificationsPage() {
  const { data: insights } = useInsights();
  const alerts = Array.isArray(insights?.alerts) ? insights.alerts : [];

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-extrabold text-white mb-6">Notifications</h1>
      {alerts.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-400 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 flex gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-purple-400 mt-0.5 shrink-0">◉</span>
              <p className="text-sm text-gray-300">{typeof alert === "string" ? alert : String(alert)}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
