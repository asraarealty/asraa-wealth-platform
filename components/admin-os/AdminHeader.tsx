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
    <header className="border-b border-white/10 bg-[#040915]/95 backdrop-blur-xl">
      <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300/70">Institutional Operations Platform</p>
          <h1 className="text-sm sm:text-base font-semibold text-white mt-1">{activeNav.label}</h1>
          <p className="text-xs text-slate-400 mt-1">{activeNav.description}</p>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <Link href="/admin/clients/new" className="v2-select">
            Add Client
          </Link>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-slate-300">{(user?.name || user?.email || "Admin").toString()}</span>
            <span className="text-sky-300">•</span>
            <span className="text-slate-400">{user?.role || "admin"}</span>
          </div>
          <button type="button" onClick={logout} className="v2-select text-rose-300">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
