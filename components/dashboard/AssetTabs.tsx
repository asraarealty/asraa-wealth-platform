"use client";

import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";
import StocksTab from "./StocksTab";
import MutualFundsTab from "./MutualFundsTab";
import CommodityTab from "./CommodityTab";
import RealEstateTab from "./RealEstateTab";

type Tab = "stocks" | "mutual_funds" | "commodities" | "real_estate";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "stocks",
    label: "Stocks",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
  {
    id: "mutual_funds",
    label: "Mutual Funds",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
  },
  {
    id: "commodities",
    label: "Commodity",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m7.5-9h-15m12.75-6.75-10.5 13.5m0-13.5 10.5 13.5" />
      </svg>
    ),
  },
  {
    id: "real_estate",
    label: "Real Estate",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
];

interface AssetTabsProps {
  assets: Asset[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAdd: (payload: CreateAssetPayload) => Promise<void>;
  onEdit: (id: number, payload: UpdateAssetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function AssetTabs({
  assets,
  activeTab,
  onTabChange,
  onAdd,
  onEdit,
  onDelete,
}: AssetTabsProps) {
  const counts: Record<Tab, number> = {
    stocks: assets.filter((a) => a.type === "stock").length,
    mutual_funds: assets.filter((a) => a.type === "mf").length,
    commodities: assets.filter((a) => a.type === "commodity").length,
    real_estate: assets.filter((a) => a.type === "property").length,
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Tab bar — scrollable on mobile with fade edge indicators */}
      <div className="relative mb-5">
        <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          <div
            className="flex gap-1 p-1 rounded-xl w-max"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                style={
                  active
                    ? {
                        background: "rgba(201,162,39,0.15)",
                        color: "#d4af4a",
                        border: "1px solid rgba(201,162,39,0.25)",
                      }
                    : {
                        color: "rgba(255,255,255,0.5)",
                        border: "1px solid transparent",
                      }
                }
              >
                {tab.icon}
                {tab.label}
                {counts[tab.id] > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={
                      active
                        ? { background: "rgba(201,162,39,0.25)", color: "#d4af4a" }
                        : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
                    }
                  >
                    {counts[tab.id]}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>
        {/* Right fade gradient — visible hint that more tabs are off-screen */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:hidden"
          style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.03))" }}
          aria-hidden="true"
        />
      </div>

      {/* Tab content */}
      {activeTab === "stocks" && (
        <StocksTab assets={assets} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
      )}
      {activeTab === "mutual_funds" && (
        <MutualFundsTab assets={assets} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
      )}
      {activeTab === "commodities" && (
        <CommodityTab assets={assets} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
      )}
      {activeTab === "real_estate" && (
        <RealEstateTab assets={assets} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}
