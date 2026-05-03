"use client";

import { useState } from "react";
import Link from "next/link";

// ✅ Controlled routes (only existing pages)
const NAV_LINKS = [
  { label: "Home", href: "/" },
  // Uncomment when pages are created:
  // { label: "About", href: "/about" },
  // { label: "Services", href: "/services" },
  // { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05]" style={{ background: "rgba(5,11,24,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-md"
              style={{
                background: "linear-gradient(135deg, #00E5FF, #4F8CFF)",
                boxShadow: "0 0 16px rgba(0,229,255,0.4)",
                color: "#020912",
              }}
            >
              A
            </div>
            <span className="text-white font-semibold text-[17px] tracking-tight">
              Asraa{" "}
              <span style={{ color: "#00E5FF" }}>Wealth</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="hidden md:inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #00E5FF, #4F8CFF)",
                boxShadow: "0 0 20px rgba(0,229,255,0.2)",
                color: "#020912",
              }}
            >
              Get Free Plan
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.06] py-4 space-y-1 animate-fade-in">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-2 py-2.5 text-sm text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}

            <div className="pt-2">
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-semibold text-center rounded-lg transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #00E5FF, #4F8CFF)",
                  color: "#020912",
                  boxShadow: "0 0 20px rgba(0,229,255,0.2)",
                }}
              >
                Get Free Plan
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
