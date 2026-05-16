"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/components/admin-os/navigation";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-80 shrink-0 flex-col border-r border-white/10 bg-[#030915]">
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300/70">Asraa Operations OS</p>
        <p className="text-sm text-white font-semibold mt-1">Admin Intelligence Environment</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl border px-3.5 py-3 transition-colors ${
                active
                  ? "border-sky-400/40 bg-sky-500/10"
                  : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5"
              }`}
            >
              <p className={`text-sm font-semibold ${active ? "text-sky-200" : "text-white"}`}>
                {item.label}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
