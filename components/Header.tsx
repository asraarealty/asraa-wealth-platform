"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOverlayLifecycle } from "@/lib/ui/modalLifecycle";

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
  const pathname = usePathname();
  const { requestClose } = useOverlayLifecycle({
    open: menuOpen,
    onClose: () => setMenuOpen(false),
    type: "drawer",
    lockBodyScroll: true,
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#040915]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-black shadow-md"
              style={{
                background: "linear-gradient(135deg, #38bdf8, #3b82f6)",
                boxShadow: "0 0 14px rgba(56,189,248,0.38)",
              }}
            >
              A
            </div>
            <span className="text-white font-semibold text-[17px] tracking-tight">
              Asraa{" "}
              <span style={{ color: "#7dd3fc" }}>Realty</span>
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
              href="/request-access"
              className="hidden md:inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-black transition-opacity duration-200 hover:opacity-90"
              style={{
                background: "linear-gradient(90deg, #38bdf8, #3b82f6)",
                boxShadow: "0 4px 16px rgba(56,189,248,0.28)",
              }}
            >
              Request Advisory Access
            </Link>

            {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => (menuOpen ? requestClose("cancel") : setMenuOpen(true))}
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
          <>
            <button
              type="button"
              aria-label="Close menu backdrop"
              onClick={() => requestClose("backdrop")}
              className="fixed inset-0 top-16 md:hidden z-40 bg-black/70 backdrop-blur-sm"
            />
            <div className="relative z-50 md:hidden border-t border-white/[0.06] py-4 space-y-1 animate-fade-in bg-[#040915]/95">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => requestClose("programmatic")}
                  className="block px-2 py-2.5 text-sm text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}

              <div className="pt-2">
                <Link
                  href="/request-access"
                  onClick={() => requestClose("programmatic")}
                  className="block px-4 py-2.5 text-sm font-semibold text-center rounded-lg text-black"
                  style={{
                    background: "linear-gradient(90deg, #38bdf8, #3b82f6)",
                  }}
                >
                  Request Advisory Access
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
