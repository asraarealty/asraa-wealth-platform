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
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="rgba(201,162,39,0.5)"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search clients, assets…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl text-white placeholder-gray-500 focus:outline-none"
            style={{
              background: "rgba(11,61,46,0.6)",
              border: "1px solid rgba(201,162,39,0.2)",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/clients/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-opacity hover:opacity-90"
          style={{
            background: "rgba(201,162,39,0.12)",
            border: "1px solid rgba(201,162,39,0.3)",
            color: "#c9a227",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>

        <Link
          href="/admin/portfolio/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-black transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, #C9A227, #d4af4a)",
            boxShadow: "0 2px 10px rgba(201,162,39,0.3)",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Investment
        </Link>

        {/* User avatar */}
        <div
          className="flex items-center gap-2 pl-3 border-l"
          style={{ borderColor: "rgba(201,162,39,0.15)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black"
            style={{ background: "linear-gradient(135deg, #C9A227, #e8d08a)" }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-white leading-tight">
              {user?.name ?? "Admin"}
            </p>
            <p className="text-[10px] text-gray-500 leading-tight">
              {user?.role ?? "Administrator"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
