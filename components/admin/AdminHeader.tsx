"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AdminHeader() {
  const { user } = useAuth();

  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0 border-b"
      style={{
        background: "rgba(11,61,46,0.7)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "rgba(201,162,39,0.15)",
      }}
    >
      {/* Logo */}
      <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
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

      {/* Search */}
      <div className="flex-1 max-w-sm mx-8 hidden md:block">
        <div className="relative">
          <input
            type="search"
            placeholder="Search clients, assets…"
            className="w-full pl-4 pr-4 py-2 text-sm rounded-xl text-white placeholder-gray-500 focus:outline-none"
            style={{
              background: "rgba(11,61,46,0.6)",
              border: "1px solid rgba(201,162,39,0.2)",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href="/admin/clients/new" className="px-3 py-2 text-xs rounded-xl text-yellow-400">
          Add Client
        </Link>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-3 border-l border-yellow-700/20">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black bg-yellow-400">
            {(user?.name?.charAt(0) || user?.email?.charAt(0) || "A").toUpperCase()}
          </div>

          <div className="hidden md:block">
            <p className="text-xs font-semibold text-white">
              {user?.name || user?.email || "Admin"}
            </p>
            <p className="text-[10px] text-gray-500">
              {user?.role ?? "Administrator"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
