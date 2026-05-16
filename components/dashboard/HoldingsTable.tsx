"use client";

import { useState } from "react";
import type { Position } from "@/lib/mappers/mapPortfolio";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

interface HoldingsTableProps {
  positions: Position[];
}
const TYPE_LABELS: Record<Position["type"], string> = {
  stock: "Stock",
  mf: "Mutual Fund",
  property: "Property",
};

const TYPE_BADGE_STYLES: Record<Position["type"], string> = {
  stock: "bg-gold/10 text-gold-light border-gold/20",
  mf: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  property: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

type SortKey = "name" | "type" | "value" | "returnPercent";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: null, label: "Qty" },
  { key: null, label: "Avg Price" },
  { key: null, label: "Current Price" },
  { key: "value", label: "Value" },
  { key: "returnPercent", label: "Return %" },
];

export default function HoldingsTable({ positions }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey | null) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...positions].sort((a, b) => {
    let av: any = a[sortKey] ?? "";
    let bv: any = b[sortKey] ?? "";
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  if (positions.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm text-gray-500">No holdings to display.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {COLUMNS.map(({ key, label }) => (
              <th
                key={label}
                onClick={() => handleSort(key)}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap select-none ${key ? "cursor-pointer hover:text-gold-light" : ""}`}
                style={{
                  borderBottom: "1px solid rgba(201,162,39,0.15)",
                  color: sortKey === key ? "#d4af4a" : "#c9a227",
                }}
              >
                {label}
                {key && sortKey === key && (
                  <span className="ml-1 text-[10px]">
                    {sortDir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos) => {
            const isPositive = pos.returnPercent >= 0;
            return (
              <tr
                key={pos.id}
                className="transition-colors hover:bg-[rgba(201,162,39,0.04)]"
                style={{ borderBottom: "1px solid rgba(201,162,39,0.07)" }}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate max-w-[160px]">
                      {pos.name}
                    </p>
                    {pos.symbol && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {pos.symbol}
                      </p>
                    )}
                  </div>
                </td>
                {/* Type */}
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_BADGE_STYLES[pos.type] || "bg-gray-500/10 text-gray-400"}`}
                  >
                    {TYPE_LABELS[pos.type] || "Other"}
                  </span>
                </td>
                {/* Qty */}
                <td className="px-4 py-3 text-gray-300 tabular-nums">
                  {(pos.quantity ?? 0).toLocaleString("en-IN")}
                </td>
                {/* Avg Price */}
                <td className="px-4 py-3 text-gray-300 tabular-nums whitespace-nowrap">
                  {fmtCurrency(pos.avgPrice)}
                </td>
                {/* Current Price */}
                <td className="px-4 py-3 text-white font-medium tabular-nums whitespace-nowrap">
                  {fmtCurrency(pos.currentPrice)}
                </td>
                {/* Value */}
                <td className="px-4 py-3 text-white font-semibold tabular-nums whitespace-nowrap">
                  {fmtCurrency(pos.value)}
                </td>
                {/* Return % */}
                <td
                  className={`px-4 py-3 font-semibold tabular-nums whitespace-nowrap ${
                    isPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {isPositive ? "▲" : "▼"} {fmtPercent(Math.abs(pos.returnPercent))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
