"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOperatingContext } from "@/context/OperatingContext";
import { useEffect } from "react";

/* ─── SVG icon set ───────────────────────────────────────────────────────── */
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 14V10h4v4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 6h1.5M9.5 6H11M5 9h1.5M9.5 9H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 3V1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconInsights() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M2 12L5.5 7.5L8.5 10L12 5L14 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconAssets() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 1L15 5V11L8 15L1 11V5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 1V15M1 5L15 11M15 5L1 11" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.4" />
    </svg>
  );
}
function IconTransactions() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M2 5H14M2 5L5 2M2 5L5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11H2M14 11L11 8M14 11L11 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 1.5C5.5 1.5 4 3.5 4 5.5V9.5L2 11.5H14L12 9.5V5.5C12 3.5 10.5 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 11.5C6.5 12.3 7.2 13 8 13C8.8 13 9.5 12.3 9.5 11.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function IconActivity() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M1 8H3.5L5.5 3L8 12.5L10 6L11.5 9.5H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 14C2 11.2 4.7 9 8 9C11.3 9 14 11.2 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const NAV = [
  { href: "/dashboard",     label: "Portfolio",       short: "Portfolio",  Icon: IconDashboard },
  { href: "/real-estate",   label: "Real Estate",     short: "Property",   Icon: IconBuilding },
  { href: "/insights",      label: "AI Insights",     short: "Insights",   Icon: IconInsights },
  { href: "/assets",        label: "Assets",          short: "Assets",     Icon: IconAssets },
  { href: "/transactions",  label: "Transactions",    short: "Transactions", Icon: IconTransactions },
  { href: "/notifications", label: "Notifications",   short: "Alerts",     Icon: IconBell },
  { href: "/activity",      label: "Activity",        short: "Activity",   Icon: IconActivity },
  { href: "/profile",       label: "Profile",         short: "Profile",    Icon: IconUser },
];

const MOBILE_DOCK = NAV.filter((n) =>
  ["/dashboard", "/real-estate", "/transactions", "/notifications", "/activity"].includes(n.href)
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  const {
    selectedAccount,
    setSelectedAccount,
    timeHorizon,
    setTimeHorizon,
    riskProfile,
    setRiskProfile,
    density,
    setDensity,
  } = useOperatingContext();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if ((user.role ?? "").toLowerCase() === "admin") router.replace("/admin");
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof document !== "undefined") document.body.dataset.density = density;
  }, [density]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080d]">
        <div className="w-7 h-7 rounded-full border-2 border-blue-500/60 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#07080d]/96 backdrop-blur-xl">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="#60a5fa" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase tracking-[0.15em] text-blue-400/60 leading-none">Asraa</p>
              <p className="text-sm font-semibold text-white leading-tight">Wealth OS</p>
            </div>
            <p className="sm:hidden text-sm font-semibold text-white">Asraa</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="v2-select hidden sm:block"
              aria-label="Selected account"
            >
              <option value="my-portfolio">My Portfolio</option>
            </select>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value as typeof timeHorizon)}
              className="v2-select"
              aria-label="Time horizon"
            >
              <option value="30d">30D</option>
              <option value="90d">90D</option>
              <option value="1y">1Y</option>
            </select>
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value as typeof riskProfile)}
              className="v2-select hidden sm:block"
              aria-label="Risk profile"
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
            </select>
            <button
              onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
              className="v2-select hidden md:inline-flex"
              type="button"
            >
              {density === "comfortable" ? "Comfortable" : "Compact"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-white/[0.07] min-h-[calc(100vh-56px)] sticky top-14">
          <nav className="flex-1 p-3 space-y-0.5">
            {NAV.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 min-h-[calc(100vh-56px)] pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">{children}</div>
        </main>
      </div>

      {/* ── Mobile bottom dock ────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.07] bg-[#07080d]/96 backdrop-blur-xl">
        <div className="grid grid-cols-5 px-1 py-2">
          {MOBILE_DOCK.map(({ href, short, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
                  active ? "text-blue-300" : "text-slate-500"
                }`}
              >
                <Icon />
                <span className="text-[10px] font-medium">{short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
