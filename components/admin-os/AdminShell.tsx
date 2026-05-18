 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-os/AdminSidebar";
import { AdminHeader } from "@/components/admin-os/AdminHeader";
import { ADMIN_NAV_ITEMS } from "@/components/admin-os/navigation";

const MOBILE_DOCK = ADMIN_NAV_ITEMS.filter((item) =>
  ["/admin", "/admin/clients", "/admin/market", "/admin/insights", "/admin/activity"].includes(item.href)
);

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">{children}</div>
          </main>
        </div>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.07] bg-[#07080d]/96 backdrop-blur-xl">
        <div className="grid grid-cols-5 px-1 py-2">
          {MOBILE_DOCK.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
                  active ? "text-blue-300" : "text-slate-500"
                }`}
              >
                <span className="text-[10px] font-medium">{item.shortLabel ?? item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
