"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col bg-slate-900 border-r border-slate-800">
      <div className="px-6 py-5 text-lg font-bold tracking-tight text-slate-100 border-b border-slate-800">
        Admin Panel
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navLinks.map(({ href, label }) => {
          const isActive =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
