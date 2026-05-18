"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAdminNavMeta } from "@/components/admin-os/navigation";

export function AdminHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const activeNav = getAdminNavMeta(pathname);

  return (
    <header className="border-b border-white/[0.07] bg-[#07080d]/96 backdrop-blur-xl">
      <div className="px-4 sm:px-6 py-3 sm:h-14 sm:py-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Page context */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[9px] uppercase tracking-[0.18em] text-blue-400/60">Admin OS</p>
            <span className="text-slate-700 text-xs">·</span>
            <h1 className="text-sm font-semibold text-white truncate">{activeNav.label}</h1>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 hidden sm:block">{activeNav.description}</p>
        </div>

        {/* Actions */}
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 text-xs shrink-0">
          <Link href="/admin/clients/new" className="v2-action">
            + Add client
          </Link>
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
            <span className="text-slate-400 text-xs">{(user?.name || user?.email || "Admin").toString()}</span>
            <span className="text-slate-600">·</span>
            <span className="text-blue-400/80 text-xs">{user?.role || "admin"}</span>
          </div>
          <button type="button" onClick={logout} className="v2-action text-rose-400/80 hover:text-rose-300">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
