"use client";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-extrabold text-white">Profile</h1>

      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ background: "linear-gradient(135deg, #38bdf8, #3b82f6)", color: "#04102a" }}>
          {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
        </div>
        <div>
          <p className="text-lg font-bold text-white">{user?.name ?? "User"}</p>
          <p className="text-sm text-gray-400">{user?.email ?? ""}</p>
          {user?.role && <p className="text-xs text-sky-400 mt-1 capitalize">{user.role}</p>}
        </div>
      </motion.div>

      {/* Menu */}
      <div className="space-y-2">
        {[
          { href: "/dashboard", icon: "⬡", label: "Dashboard" },
          { href: "/assets", icon: "◈", label: "My Assets" },
          { href: "/real-estate", icon: "⌂", label: "Properties" },
          { href: "/insights", icon: "◉", label: "AI Insights" },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-3 p-4 rounded-2xl transition-colors hover:bg-white/5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-sky-400 text-lg w-6 text-center">{item.icon}</span>
            <span className="text-sm font-medium text-gray-300">{item.label}</span>
            <span className="ml-auto text-gray-600">›</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-4 rounded-2xl font-semibold text-sm text-red-400 transition-colors hover:bg-red-500/10"
        style={{ border: "1px solid rgba(239,68,68,0.2)" }}
      >
        Sign Out
      </button>
    </div>
  );
}
