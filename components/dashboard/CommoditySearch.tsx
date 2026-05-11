"use client";

import { useCallback } from "react";
import AsyncSearchDropdown from "@/components/search/AsyncSearchDropdown";
import { searchCommodities, type CommodityResult } from "@/lib/api";

interface CommoditySearchProps {
  onSelect?: (commodity: CommodityResult) => void;
}

function assetTypeLabel(type: CommodityResult["assetType"]): string {
  if (type === "etf") return "Commodity ETF";
  if (type === "linked") return "Commodity-linked";
  return "Spot";
}

export default function CommoditySearch({ onSelect }: CommoditySearchProps) {
  const runSearch = useCallback((query: string, signal: AbortSignal) => {
    if (signal.aborted) return Promise.resolve([]);
    return searchCommodities(query, signal);
  }, []);

  const renderItem = useCallback((item: CommodityResult, active: boolean) => {
    const numericPrice =
      typeof item.currentPrice === "number" && Number.isFinite(item.currentPrice) && item.currentPrice > 0
        ? item.currentPrice
        : typeof item.spotPrice === "number" && Number.isFinite(item.spotPrice) && item.spotPrice > 0
        ? item.spotPrice
        : 0;
    const currentPrice =
      numericPrice > 0
        ? `₹${numericPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
        : "—";
    const dailyChange =
      typeof item.dailyChange === "number" && Number.isFinite(item.dailyChange)
        ? `${item.dailyChange >= 0 ? "+" : ""}${item.dailyChange.toFixed(2)}%`
        : "—";
    return (
      <div className={`flex items-start justify-between gap-4 ${active ? "search-row-active" : ""}`}>
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">{item.name}</div>
          <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
            {item.symbol} · {item.source}
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            {assetTypeLabel(item.assetType)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-white font-medium text-sm">{currentPrice}</div>
          <div className={`text-xs font-medium ${dailyChange.startsWith("-") ? "text-red-400" : "text-emerald-400"}`}>
            {dailyChange}
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <AsyncSearchDropdown<CommodityResult>
      placeholder="Search commodities — Gold, Silver, Crude, Gas, Copper"
      ariaLabel="Search commodities"
      minQueryLength={1}
      search={runSearch}
      getItemKey={(item) => item.id}
      getItemText={(item) => item.name}
      renderItem={renderItem}
      onSelect={(item) => onSelect?.(item)}
      emptyText={(q) => `No commodity matches for “${q}”`}
    />
  );
}
