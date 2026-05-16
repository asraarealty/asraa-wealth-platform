"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOperatingContext } from "@/context/OperatingContext";
import { useEffect } from "react";

const NAV = [
  { href: "/dashboard", label: "Portfolio Intelligence", icon: "⬡", short: "Home" },
  { href: "/real-estate", label: "Real Estate Ops", icon: "⌂", short: "Property" },
  { href: "/insights", label: "AI Insights", icon: "◉", short: "Insights" },
  { href: "/assets", label: "Asset Analytics", icon: "◈", short: "Assets" },
  { href: "/transactions", label: "Transactions", icon: "↹", short: "Txn" },
  { href: "/notifications", label: "Notifications", icon: "🔔", short: "Alerts" },
  { href: "/activity", label: "Activity Feed", icon: "⋯", short: "Feed" },
  { href: "/profile", label: "Profile", icon: "◎", short: "Profile" },
];

const MOBILE_DOCK = NAV.filter((n) => ["/dashboard", "/real-estate", "/transactions", "/notifications", "/activity"].includes(n.href));

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
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.dataset.density = density;
    }
  }, [density]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040915]">
        <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040915] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#040915]/95 backdrop-blur-xl">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300/70">Asraa Operating System</p>
            <h1 className="text-sm sm:text-base font-semibold text-white">AI-powered wealth and real estate platform</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="v2-select"
              aria-label="Selected account"
            >
              <option value="my-portfolio">My Portfolio</option>
            </select>
            <select value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value as typeof timeHorizon)} className="v2-select" aria-label="Time horizon">
              <option value="30d">30D</option>
              <option value="90d">90D</option>
              <option value="1y">1Y</option>
            </select>
            <select value={riskProfile} onChange={(e) => setRiskProfile(e.target.value as typeof riskProfile)} className="v2-select" aria-label="Risk profile">
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
            </select>
            <button
              onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
              className="v2-select"
              type="button"
            >
              {density === "comfortable" ? "Comfortable" : "Compact"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:block w-64 border-r border-white/10 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-3 space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    active ? "bg-sky-500/15 text-sky-300 border border-sky-400/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-73px)] pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">{children}</div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#040915]/95 backdrop-blur-xl">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {MOBILE_DOCK.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 transition-all ${
                  active ? "text-sky-300 bg-sky-500/15" : "text-slate-500"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] mt-1 font-medium">{item.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
