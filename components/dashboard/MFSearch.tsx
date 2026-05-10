"use client";

import { useCallback } from "react";
import AsyncSearchDropdown from "@/components/search/AsyncSearchDropdown";
import { searchMutualFunds, type MutualFundResult } from "@/lib/api";

interface MFSearchProps {
  onSelect?: (mf: MutualFundResult) => void;
  initialValue?: string;
}

type NormalizedMF = MutualFundResult & { key: string };

function formatAum(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function normalizeFunds(results: MutualFundResult[], query: string): NormalizedMF[] {
  const q = query.trim().toLowerCase();
  const filtered = results.filter((item) => item.name && (item.code || item.nav > 0));
  const seen = new Set<string>();
  const deduped: NormalizedMF[] = [];
  for (const item of filtered) {
    const key = item.code
      ? `code:${item.code.toUpperCase()}`
      : `name:${item.name.toLowerCase()}::${(item.amc ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...item, key });
  }

  return deduped
    .sort((a, b) => {
      const aExact = a.name.toLowerCase().startsWith(q) ? 1 : 0;
      const bExact = b.name.toLowerCase().startsWith(q) ? 1 : 0;
      const aHasNav = a.nav > 0 ? 1 : 0;
      const bHasNav = b.nav > 0 ? 1 : 0;
      return bExact - aExact || bHasNav - aHasNav || a.name.localeCompare(b.name);
    })
    .slice(0, 12);
}

export default function MFSearch({ onSelect, initialValue = "" }: MFSearchProps) {
  const runSearch = useCallback(async (query: string, signal: AbortSignal) => {
    const raw = await searchMutualFunds(query, signal);
    return normalizeFunds(Array.isArray(raw) ? raw : [], query);
  }, []);

  const renderItem = useCallback((mf: NormalizedMF) => {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">{mf.name}</div>
          <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
            {(mf.amc ?? mf.fundHouse ?? "Unknown AMC")}
            {mf.category ? ` · ${mf.category}` : ""}
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            AUM: {formatAum(mf.aum)} {mf.riskLevel ? `· Risk: ${mf.riskLevel}` : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-white font-medium">₹{mf.nav > 0 ? mf.nav.toFixed(2) : "—"}</div>
          <div className="text-xs" style={{ color: "rgba(201,162,39,0.6)" }}>
            NAV
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <AsyncSearchDropdown<NormalizedMF>
      placeholder="Search mutual funds — AMC, category, scheme"
      ariaLabel="Search mutual funds"
      minQueryLength={2}
      initialValue={initialValue}
      search={runSearch}
      getItemKey={(item) => item.key}
      getItemText={(item) => item.name}
      renderItem={renderItem}
      onSelect={(item) => onSelect?.(item)}
      emptyText={(q) => `No mutual fund matches for “${q}”`}
    />
  );
}
