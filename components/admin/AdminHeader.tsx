"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AdminHeader() {
  const { user } = useAuth();

  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0 border-b"
      style={{
        background: "rgba(7,9,14,0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Mobile logo (sidebar is hidden on mobile) */}
      <Link href="/admin" className="flex items-center gap-2 md:hidden shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-black shadow-md"
          style={{
            background: "linear-gradient(135deg, #C9A227, #e8d08a)",
            boxShadow: "0 0 12px rgba(201,162,39,0.4)",
          }}
        >
          A
        </div>
        <span className="text-white font-semibold text-base tracking-tight">
          Asraa <span style={{ color: "#C9A227" }}>Realty</span>
        </span>
      </Link>

      {/* Desktop: spacer so actions stay right */}
      <div className="hidden md:block" />

      {/* Search */}
      <div className="flex-1 max-w-sm mx-8 hidden md:block">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search clients, assets…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          aria-label="Notifications"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </button>

        {/* Add Asset */}
        <Link
          href="/admin/assets"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white transition-all hover:opacity-90"
          style={{
            background: "rgba(0,229,255,0.1)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "#00E5FF",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Asset
        </Link>

        {/* Add Client */}
        <Link
          href="/admin/clients/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, #C9A227, #d4af4a)",
            color: "#071a14",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Client
        </Link>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black"
            style={{ background: "linear-gradient(135deg, #C9A227, #e8d08a)" }}
          >
            {(user?.name?.charAt(0) || user?.email?.charAt(0) || "A").toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-white leading-none">
              {user?.name || user?.email || "Admin"}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {user?.role ?? "Administrator"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
