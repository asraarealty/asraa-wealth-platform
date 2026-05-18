"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/components/admin-os/navigation";

/* Minimal SVG icon set for admin nav */
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/admin": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  "/admin/clients": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 12.5C1.5 10 4 8 7 8C10 8 12.5 10 12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  "/admin/market": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M1.5 10.5L4.5 7.5L7 9L10.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 2V12.5H12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "/admin/analytics": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M2 11.5V7.5M6 11.5V3.5M10 11.5V5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M1.5 12.5H12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  "/admin/assets": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  "/admin/real-estate": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <rect x="2" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 13V9h4v4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 3V1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  "/admin/transactions": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M1 4.5H13M1 4.5L4 1.5M1 4.5L4 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 9.5H1M13 9.5L10 6.5M13 9.5L10 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "/admin/insights": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M1 10.5L4.5 6L7.5 8.5L11 4L13 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "/admin/notifications": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M7 1C4.8 1 3.5 2.8 3.5 4.5V8.5L2 10H12L10.5 8.5V4.5C10.5 2.8 9.2 1 7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.5 10C5.5 11 6.2 11.5 7 11.5C7.8 11.5 8.5 11 8.5 10" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  "/admin/activity": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M1 7H3L5 2.5L7 11L9 5.5L10.5 8H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "/admin/vendors": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 7H10M7 4V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  "/admin/reports": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5H9M5 7.5H9M5 10H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  "/admin/system-settings": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 1V2.5M7 11.5V13M1 7H2.5M11.5 7H13M2.6 2.6L3.7 3.7M10.3 10.3L11.4 11.4M11.4 2.6L10.3 3.7M3.7 10.3L2.6 11.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  "/admin/risk": (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 5.5V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="10" r="0.6" fill="currentColor" />
    </svg>
  ),
};

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-white/[0.07] bg-[#07080d]">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/12 border border-blue-500/20 flex items-center justify-center shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1L12 4V9L6.5 12L1 9V4L6.5 1Z" stroke="#60a5fa" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-blue-400/60 leading-none">Asraa</p>
            <p className="text-sm font-semibold text-white leading-tight">Operations OS</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
                active
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-300"
                  : "border border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <span className={active ? "text-blue-400" : "text-slate-600"}>
                {NAV_ICONS[item.href] ?? null}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${active ? "text-blue-200" : "text-slate-300"}`}>
                  {item.label}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
