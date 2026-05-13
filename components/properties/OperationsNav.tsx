"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/properties", label: "Properties" },
  { href: "/tenants", label: "Tenants" },
  { href: "/leases", label: "Leases" },
  { href: "/rent", label: "Rent" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/reports", label: "Reports" },
];

export default function OperationsNav() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 min-w-max">
        {links.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
              style={
                isActive
                  ? {
                      background: "rgba(0,229,255,0.16)",
                      color: "#7dd3fc",
                      border: "1px solid rgba(0,229,255,0.25)",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
