"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOperatingContext } from "@/context/OperatingContext";
import { useMarketDomainGraph } from "@/domains/market";
import { MarketSnapshotStrip } from "@/components/market/MarketSnapshotStrip";

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

function IconOnboarding() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMarket() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M2 11.5L5.2 8.2L8 9.8L11.5 5L14 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 2V14H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.8 5.2L9.2 9.2L5.2 10.8L6.8 6.8L10.8 5.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function IconWatchlist() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 1.8L9.9 5.7L14.2 6.3L11.1 9.4L11.8 13.8L8 11.8L4.2 13.8L4.9 9.4L1.8 6.3L6.1 5.7L8 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
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
  { href: "/dashboard", label: "Portfolio", short: "Portfolio", Icon: IconDashboard },
  { href: "/onboarding", label: "Client Access", short: "Access", Icon: IconOnboarding },
  { href: "/stocks", label: "Stocks", short: "Stocks", Icon: IconMarket },
  { href: "/markets", label: "Markets", short: "Markets", Icon: IconMarket },
  { href: "/watchlist", label: "Watchlist", short: "Watchlist", Icon: IconWatchlist },
  { href: "/discover", label: "Discover", short: "Discover", Icon: IconCompass },
  { href: "/real-estate", label: "Real Estate", short: "Property", Icon: IconBuilding },
  { href: "/assets", label: "Assets", short: "Assets", Icon: IconAssets },
  { href: "/transactions", label: "Transactions", short: "Deals", Icon: IconTransactions },
  { href: "/notifications", label: "Notifications", short: "Alerts", Icon: IconBell },
  { href: "/activity", label: "Activity", short: "Activity", Icon: IconActivity },
  { href: "/profile", label: "Profile", short: "Profile", Icon: IconUser },
];

const MOBILE_DOCK = NAV.filter((n) =>
  ["/dashboard", "/stocks", "/watchlist", "/discover", "/activity"].includes(n.href)
);
const NAV_GROUPS: { title: string; hrefs: string[] }[] = [
  { title: "Overview", hrefs: ["/dashboard", "/onboarding"] },
  { title: "Markets", hrefs: ["/stocks", "/markets", "/watchlist", "/discover"] },
  { title: "Portfolio", hrefs: ["/real-estate", "/assets", "/transactions"] },
  { title: "Operations", hrefs: ["/notifications", "/activity", "/profile"] },
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, authReady, authenticated, isRefreshing } = useAuth();
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
  const { search, searchMarket, runtime, lastUpdated, refresh } = useMarketDomainGraph();
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    if (!authReady || isRefreshing) return;
    if (!authenticated || !user) {
      router.replace("/login");
      return;
    }
    if ((user.role ?? "").toLowerCase() === "admin") {
      router.replace("/admin");
    }
  }, [authReady, authenticated, isRefreshing, router, user]);

  useEffect(() => {
    if (typeof document !== "undefined") document.body.dataset.density = density;
  }, [density]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchMarket(globalSearch);
    }, 220);
    return () => clearTimeout(timer);
  }, [globalSearch, searchMarket]);

  if (!authReady || isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080d]">
        <div className="w-7 h-7 rounded-full border-2 border-blue-500/60 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07080d] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#07080d]/96 backdrop-blur-xl">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
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
        <MarketSnapshotStrip />
        <div className="border-t border-white/10 px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Global search: symbol, company, sector, macro signal"
              aria-label="Global market search"
              className="h-8 min-w-[16rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-300/50"
            />
            <span className={`rounded-md border px-2 py-1 text-[10px] ${runtime.connected ? "border-emerald-400/40 text-emerald-300" : "border-amber-300/40 text-amber-200"}`}>
              {runtime.connected ? "Live Market" : "Connecting"}
            </span>
            <button type="button" onClick={() => void refresh()} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/[0.05]">
              Refresh
            </button>
            <span className="text-[10px] text-slate-500">
              Updated{" "}
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
            </span>
          </div>
          {globalSearch.trim().length > 0 ? (
            <div className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-black/35 p-2 text-[11px]">
              {search.isSearching ? (
                <p className="text-slate-500">Searching runtime feeds…</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {[...(search.groups.stocks ?? []), ...(search.groups.etfs ?? []), ...(search.groups.commodities ?? [])]
                    .slice(0, 12)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => router.push("/stocks")}
                        className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-white/[0.08]"
                      >
                        {item.symbol}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-white/[0.07] min-h-[calc(100vh-132px)] sticky top-[132px]">
          <nav className="flex-1 space-y-4 p-3.5">
            {NAV_GROUPS.map((group) => (
              <section key={group.title} className="space-y-1.5">
                <p className="px-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">{group.title}</p>
                <div className="space-y-1">
                  {group.hrefs.map((href) => {
                    const nav = NAV.find((item) => item.href === href);
                    if (!nav) return null;
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    const Icon = nav.Icon;
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "border-sky-400/25 bg-sky-500/10 text-sky-200"
                            : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200"
                        }`}
                      >
                        <Icon />
                        <span>{nav.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-132px)] overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">{children}</div>
        </main>
      </div>

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
