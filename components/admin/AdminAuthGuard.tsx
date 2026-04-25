"use client";

import { useAuth } from "@/context/AuthContext";

export default function AdminHeader() {
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <div>
        <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
        <p className="text-xs text-gray-400">
          Welcome back, {user?.name || user?.email || "Admin"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 flex items-center justify-center rounded-full text-black font-semibold text-sm"
          style={{
            background: "linear-gradient(135deg, #C9A227, #e8d08a)",
          }}
        >
          {
            user?.name?.charAt(0)?.toUpperCase() ||
            user?.email?.charAt(0)?.toUpperCase() ||
            "A"
          }
        </div>

        {/* User Info */}
        <div className="hidden md:block">
          <p className="text-xs font-semibold text-white leading-tight">
            {user?.name || "Admin"}
          </p>
          <p className="text-[10px] text-gray-400">
            {user?.email || "admin@asraarealty.com"}
          </p>
        </div>
      </div>
    </div>
  );
}
