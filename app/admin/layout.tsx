import Link from "next/link";
import React from "react";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0b1220",
        color: "#f1f5f9",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          flexShrink: 0,
          backgroundColor: "#111827",
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{
            padding: "0 24px 24px",
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            borderBottom: "1px solid #1f2937",
            marginBottom: "8px",
          }}
        >
          Admin Panel
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {sidebarLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "block",
                padding: "10px 24px",
                color: "#cbd5e1",
                textDecoration: "none",
                fontSize: "14px",
                borderRadius: "4px",
                margin: "0 8px",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "#1f2937")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent")
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "32px",
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
